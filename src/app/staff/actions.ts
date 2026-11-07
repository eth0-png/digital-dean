"use server";

import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { UUID } from "@/lib/applications";

// Действия сотрудника. Каждое само проверяет роль и допустимый переход статуса в WHERE:
// заявку нельзя выдать дважды, а закрытую нельзя снова взять в работу.

type Result = { error?: string };

async function move(id: string, from: string[], to: string, kind: string, text: string | null = null): Promise<Result> {
  const staff = await requireStaff();
  if (!UUID.test(String(id))) return { error: "Заявка не найдена." };
  // Код проверки по QR только у справок: у заявлений на пересдачу и исправление данных документа нет
  const code = to === "ready" ? randomBytes(16).toString("hex") : null;
  const done = await sql.begin(async (tx) => {
    const [app] = await tx<{ id: string }[]>`
      update applications set status = ${to}, updated_at = now(),
        verify_code = case when type in ('study', 'military') and ${code}::text is not null then ${code}::text else verify_code end
      where id = ${id} and status in ${tx(from)}
      returning id`;
    if (!app) return false;
    await tx`insert into application_events (application_id, kind, text, author_id) values (${app.id}, ${kind}, ${text}, ${staff.id})`;
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

export async function askQuestion(id: string, question: string) {
  const q = clean(question, "вопрос студенту");
  return isError(q) ? q : move(id, ["submitted", "in_progress"], "need_info", "question", q);
}

export async function issue(id: string, comment: string) {
  const c = clean(comment, null);
  return isError(c) ? c : move(id, ["submitted", "in_progress", "need_info"], "ready", "ready", c);
}

export async function reject(id: string, reason: string) {
  const r = clean(reason, "причину отказа");
  return isError(r) ? r : move(id, ["submitted", "in_progress", "need_info"], "rejected", "rejected", r);
}

/** Сотрудник открыл заявку: ответы студента отмечаются прочитанными, студент видит «прочитано». */
export async function markRead(id: string) {
  await requireStaff();
  if (!UUID.test(String(id))) return;
  await sql`update application_events set read_at = now()
            where application_id = ${id} and kind in ('answer', 'message') and read_at is null`;
}
