"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import type postgres from "postgres";
import { sql } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fingerprint, isUuid } from "@/lib/applications";

// Действия сотрудника. Каждое само проверяет роль и допустимый переход статуса в WHERE:
// заявку нельзя выдать дважды, а закрытую нельзя снова взять в работу.

type Result = { error?: string };

type Tx = postgres.TransactionSql;

async function move(id: string, from: string[], to: string, kind: string, text: string | null = null, also?: (tx: Tx, id: string) => Promise<unknown>): Promise<Result> {
  const staff = await requireStaff();
  if (!isUuid(id)) return { error: "Заявка не найдена." };
  // Код проверки по QR только у справок: у заявлений на пересдачу и исправление данных документа нет.
  // Вместе с кодом запоминаем ФИО владельца на момент выдачи: справка и проверка по QR показывают его, а не текущий профиль.
  const code = to === "ready" ? randomBytes(16).toString("hex") : null;
  const done = await sql.begin(async (tx) => {
    const [app] = await tx<{ id: string }[]>`
      update applications set status = ${to}, updated_at = now(),
        verify_code = case when type in ('study', 'military') and ${code}::text is not null then ${code}::text else verify_code end,
        holder = case when type in ('study', 'military') and ${code}::text is not null
          then (select array[u.last_name, u.first_name, coalesce(u.middle_name, '')] from users u where u.id = applications.user_id)
          else holder end
      where id = ${id} and status in ${tx(from)}
      returning id`;
    if (!app) return false;
    await tx`insert into application_events (application_id, kind, text, author_id) values (${app.id}, ${kind}, ${text}, ${staff.id})`;
    if (also) await also(tx, app.id);
    return true;
  });
  return done ? {} : { error: "Статус заявки уже изменился. Обновите страницу." };
}

function clean(t: unknown, what: string | null): string | null | Result {
  const s = String(t ?? "").trim();
  if (s.length > 1000) return { error: "Слишком длинный текст. Сократите до 1000 знаков." };
  if (what && s.length < 3) return { error: `Напишите ${what}.` };
  return s || null;
}
const isError = (v: unknown): v is Result => typeof v === "object" && v !== null;

export async function takeInWork(id: string) {
  return move(id, ["submitted"], "in_progress", "in_progress");
}

/**
 * Сообщение студенту в переписке. Статус не меняет: пауза только через «Запросить уточнение».
 * Писать можно, пока заявка не закрыта. refresh() возвращает новую переписку вместе с ответом сервера.
 */
export async function sendReply(id: string, text: string): Promise<Result> {
  const staff = await requireStaff();
  const t = clean(text, "сообщение студенту");
  if (isError(t)) return t;
  if (!isUuid(id)) return { error: "Заявка не найдена." };
  const sent = await sql.begin(async (tx) => {
    const [app] = await tx<{ status: string }[]>`
      select status from applications where id = ${id} and status in ('submitted', 'in_progress', 'need_info') for update`;
    if (!app) return false;
    await tx`insert into application_events (application_id, kind, text, author_id) values (${id}, 'reply', ${t}, ${staff.id})`;
    return true;
  });
  if (!sent) return { error: "Заявка уже закрыта, переписка завершена." };
  refresh();
  return {};
}

// Буквы, пробел, дефис, апостроф. До 40 знаков
const NAME = /^\p{L}[\p{L} '-]{0,39}$/u;

/** Запросить уточнение: вопрос студенту, заявка на паузе («На уточнении»), пока он не ответит. */
export async function askStudent(id: string, question: string) {
  await requireStaff(); // роль первой строкой, до разбора текста
  const q = clean(question, "что нужно от студента");
  return isError(q) ? q : move(id, ["submitted", "in_progress"], "need_info", "question", q);
}

/**
 * Заявка выполнена. У заявки на исправление данных сотрудник может сразу поправить ФИО в профиле:
 * в той же транзакции и только у владельца этой заявки (type = 'data_fix').
 */
export async function issue(id: string, comment: string, names?: { last: string; first: string; middle: string }) {
  await requireStaff();
  const c = clean(comment, null);
  if (isError(c)) return c;
  if (!names) return move(id, ["submitted", "in_progress", "need_info"], "ready", "ready", c);
  const [last, first, middle] = [names.last, names.first, names.middle].map((v) => String(v ?? "").trim());
  if (!NAME.test(last)) return { error: "Проверьте фамилию: только буквы, до 40 знаков." };
  if (!NAME.test(first)) return { error: "Проверьте имя: только буквы, до 40 знаков." };
  if (middle && !NAME.test(middle)) return { error: "Проверьте отчество: только буквы, до 40 знаков." };
  const text = c ?? `Исправили ФИО в профиле: ${last} ${first} ${middle}`.trim();
  return move(id, ["submitted", "in_progress", "need_info"], "ready", "ready", text, async (tx, appId) => {
    const fixed = await tx`
      update users u set last_name = ${last}, first_name = ${first}, middle_name = ${middle || null}
      from applications a where a.id = ${appId} and a.type = 'data_fix' and u.id = a.user_id and u.role = 'student'`;
    if (fixed.count !== 1) throw new Error("Заявка не на исправление данных");
  });
}

export async function reject(id: string, reason: string) {
  await requireStaff();
  const r = clean(reason, "причину отказа");
  return isError(r) ? r : move(id, ["submitted", "in_progress", "need_info"], "rejected", "rejected", r);
}

/** Сотрудник видит переписку (шторка открыта, вкладка на экране): сообщения студента прочитаны, студент видит «прочитано». */
export async function markRead(id: string) {
  await requireStaff();
  if (!isUuid(id)) return;
  await sql`update application_events set seen_at = now(), read_at = coalesce(read_at, now())
            where application_id = ${id} and kind in ('answer', 'message') and seen_at is null`;
  refresh();
}

/**
 * Отпечаток очереди: число заявок, последняя смена статуса, число сообщений и прочтений.
 * Новая заявка, смена статуса или ответ студента меняют его, и очередь перерисовывается сама.
 */
export async function queueVersion() {
  await requireStaff();
  const [r] = await sql<{ v: string }[]>`
    select concat_ws('|', (select count(*) from applications), (select max(updated_at) from applications),
      (select count(*) from application_events), (select count(seen_at) from application_events)) as v`;
  return r.v;
}

/** Отпечаток заявки для живого обновления карточки сотрудника. */
export async function staffVersion(id: string) {
  await requireStaff();
  return fingerprint(id, "staff");
}
