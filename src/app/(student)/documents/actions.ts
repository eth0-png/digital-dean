"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { sql } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { dueDate, fingerprint, isUuid } from "@/lib/applications";
import { DOC_TYPES, PURPOSES, isDocType } from "@/lib/documents";
import { NOTICE_KINDS } from "@/lib/notifications";

// Серверные действия «Документов». Каждое само проверяет, кто вошёл, и не верит данным из формы.

export type OrderState = { error?: string };

const OPEN = ["submitted", "in_progress", "need_info"];
// Пределы на одного студента: без них один аккаунт мог бы завалить очередь деканата.
// ponytail: проверка перед вставкой без блокировки, одновременные запросы могут превысить предел на несколько заявок.
const MAX_OPEN = 20; // открытых заявок одновременно
const MAX_PER_DAY = 100; // новых заявок за сутки
const MAX_EVENTS = 300; // событий в одной заявке: сообщения и этапы

export async function createApplication(_prev: OrderState, form: FormData): Promise<OrderState> {
  const user = await requireStudent();
  const type = form.get("type");
  if (!isDocType(type)) return { error: "Такого документа нет. Вернитесь в «Документы» и выберите снова." };
  const cfg = DOC_TYPES[type];

  const purpose = cfg.purpose ? String(form.get("purpose") ?? "") : null;
  if (cfg.purpose && !PURPOSES.includes(purpose!)) return { error: "Укажите, куда нужна справка." };

  const format = cfg.formats.length === 0 ? "electronic" : cfg.formats.includes(form.get("format") as never) ? String(form.get("format")) : cfg.formats[0];
  const copies = format === "paper" ? Math.min(5, Math.max(1, Math.trunc(Number(form.get("copies"))) || 1)) : 1;

  const details = cfg.details ? String(form.get("details") ?? "").trim() : null;
  if (cfg.details && (details ?? "").length < 3) return { error: cfg.details.error };
  if ((details ?? "").length > 1000) return { error: "Слишком длинный текст. Сократите до 1000 знаков." };

  const [n] = await sql<{ open: number; today: number }[]>`
    select count(*) filter (where status in ${sql(OPEN)})::int as open,
           count(*) filter (where created_at > now() - interval '1 day')::int as today
    from applications where user_id = ${user.id}`;
  if (n.open >= MAX_OPEN) return { error: `У вас уже ${MAX_OPEN} открытых заявок. Дождитесь ответа по ним или отмените лишние.` };
  if (n.today >= MAX_PER_DAY) return { error: "Слишком много заявок за сутки. Попробуйте завтра." };

  // Заявка и её первое событие одной транзакцией: заявки без истории не бывает
  const id = await sql.begin(async (tx) => {
    const [app] = await tx<{ id: string }[]>`
      insert into applications (user_id, type, purpose, format, copies, details, due_date)
      values (${user.id}, ${type}, ${purpose}, ${format}, ${copies}, ${details}, ${dueDate(cfg.days)})
      returning id`;
    await tx`insert into application_events (application_id, kind, author_id) values (${app.id}, 'submitted', ${user.id})`;
    return app.id;
  });
  redirect(`/documents/${id}?sent=1`);
}

/**
 * Сообщение деканату по заявке. Если деканат ждал ответа, это ответ, и заявка возвращается в работу.
 * Писать можно, пока заявка не закрыта. refresh() возвращает новую переписку вместе с ответом сервера.
 */
export async function sendMessage(appId: string, text: string): Promise<{ error?: string }> {
  const user = await requireStudent();
  const t = String(text ?? "").trim();
  if (!isUuid(appId)) return { error: "Заявка не найдена." };
  if (!t) return { error: "Напишите сообщение." };
  if (t.length > 1000) return { error: "Слишком длинное сообщение. Сократите до 1000 знаков." };

  const sent = await sql.begin(async (tx) => {
    const [app] = await tx<{ status: string }[]>`
      select status from applications where id = ${appId} and user_id = ${user.id} and status in ${tx(OPEN)} for update`;
    if (!app) return false;
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from application_events where application_id = ${appId}`;
    if (n >= MAX_EVENTS) return "full";
    const answer = app.status === "need_info";
    // Пока ждали ответа, срок стоял: сдвигаем его на дни паузы
    if (answer)
      await tx`update applications set status = 'in_progress', updated_at = now(),
        due_date = due_date + greatest(0, current_date - coalesce(
          (select max(created_at)::date from application_events where application_id = ${appId} and kind = 'question'), current_date))
        where id = ${appId} and user_id = ${user.id}`;
    await tx`insert into application_events (application_id, kind, text, author_id) values (${appId}, ${answer ? "answer" : "message"}, ${t}, ${user.id})`;
    return true;
  });
  if (sent === "full") return { error: "В этой заявке слишком много сообщений. Подайте новую заявку." };
  if (!sent) return { error: "Заявка уже закрыта, переписка завершена." };
  refresh();
  return {};
}

/** Студент отменил заявку. Только свою и только пока её не закрыли. */
export async function cancelApplication(appId: string): Promise<{ error?: string }> {
  const user = await requireStudent();
  if (!isUuid(appId)) return { error: "Заявка не найдена." };
  const done = await sql.begin(async (tx) => {
    const [app] = await tx<{ id: string }[]>`
      update applications set status = 'cancelled', updated_at = now()
      where id = ${appId} and user_id = ${user.id} and status in ${tx(OPEN)}
      returning id`;
    if (!app) return false;
    await tx`insert into application_events (application_id, kind, author_id) values (${app.id}, 'cancelled', ${user.id})`;
    return true;
  });
  if (!done) return { error: "Заявку уже закрыли, отменить её нельзя." };
  refresh();
  return {};
}

/**
 * Студент открыл заявку: всё, что сделал деканат, прочитано. Деканат видит «прочитано» под сообщениями,
 * уведомления по заявке гаснут, refresh() обновляет счётчик на колокольчике в шапке.
 */
export async function markDeanRead(appId: string) {
  const user = await requireStudent();
  if (!isUuid(appId)) return;
  await sql`
    update application_events e set read_at = now()
    from applications a
    where e.application_id = a.id and a.id = ${appId} and a.user_id = ${user.id}
      and e.kind in ${sql(NOTICE_KINDS)} and e.read_at is null`;
  // Вопрос деканата и комментарий к готовой или отклонённой заявке видны прямо на странице заявки
  await sql`
    update application_events e set seen_at = now()
    from applications a
    where e.application_id = a.id and a.id = ${appId} and a.user_id = ${user.id}
      and e.kind in ('question', 'ready', 'rejected') and e.text is not null and e.seen_at is null`;
  refresh();
}

/** Студент видит переписку (шторка открыта, вкладка на экране): все сообщения деканата прочитаны. */
export async function markDeanSeen(appId: string) {
  const user = await requireStudent();
  if (!isUuid(appId)) return;
  await sql`
    update application_events e set seen_at = now(), read_at = coalesce(e.read_at, now())
    from applications a
    where e.application_id = a.id and a.id = ${appId} and a.user_id = ${user.id}
      and e.kind in ('question', 'reply', 'ready', 'rejected') and e.text is not null and e.seen_at is null`;
  refresh();
}

/** Отпечаток своей заявки для живого обновления. Чужая заявка даёт пустую строку. */
export async function myVersion(appId: string) {
  const user = await requireStudent();
  return fingerprint(appId, user.id);
}
