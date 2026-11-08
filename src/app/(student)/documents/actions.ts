"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { sql } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { UUID, dueDate } from "@/lib/applications";
import { DOC_TYPES, PURPOSES, isDocType } from "@/lib/documents";
import { NOTICE_KINDS } from "@/lib/notifications";

// Серверные действия «Документов». Каждое само проверяет, кто вошёл, и не верит данным из формы.

export type OrderState = { error?: string };

export async function createApplication(_prev: OrderState, form: FormData): Promise<OrderState> {
  const user = await requireStudent();
  const type = form.get("type");
  if (!isDocType(type)) return { error: "Такого документа нет. Вернитесь в «Документы» и выберите снова." };
  const cfg = DOC_TYPES[type];

  const purpose = cfg.purpose ? String(form.get("purpose") ?? "") : null;
  if (cfg.purpose && !PURPOSES.includes(purpose!)) return { error: "Укажите, куда нужна справка." };

  const format = cfg.formats.length === 0 ? "electronic" : cfg.formats.includes(form.get("format") as never) ? String(form.get("format")) : cfg.formats[0];
  const copies = format === "paper" ? Math.min(5, Math.max(1, Number(form.get("copies")) || 1)) : 1;

  const details = cfg.details ? String(form.get("details") ?? "").trim() : null;
  if (cfg.details && (details ?? "").length < 3) return { error: cfg.details.error };
  if ((details ?? "").length > 1000) return { error: "Слишком длинный текст. Сократите до 1000 знаков." };

  const [app] = await sql<{ id: string }[]>`
    insert into applications (user_id, type, purpose, format, copies, details, due_date)
    values (${user.id}, ${type}, ${purpose}, ${format}, ${copies}, ${details}, ${dueDate(cfg.days)})
    returning id`;
  await sql`insert into application_events (application_id, kind, author_id) values (${app.id}, 'submitted', ${user.id})`;
  redirect(`/documents/${app.id}?sent=1`);
}

const OPEN = ["submitted", "in_progress", "need_info"];

/**
 * Сообщение деканату по заявке. Если деканат ждал ответа, это ответ, и заявка возвращается в работу.
 * Писать можно, пока заявка не закрыта. refresh() возвращает новую переписку вместе с ответом сервера.
 */
export async function sendMessage(appId: string, text: string): Promise<{ error?: string }> {
  const user = await requireStudent();
  const t = String(text ?? "").trim();
  if (!UUID.test(String(appId))) return { error: "Заявка не найдена." };
  if (!t) return { error: "Напишите сообщение." };
  if (t.length > 1000) return { error: "Слишком длинное сообщение. Сократите до 1000 знаков." };

  const sent = await sql.begin(async (tx) => {
    const [app] = await tx<{ status: string }[]>`
      select status from applications where id = ${appId} and user_id = ${user.id} and status in ${tx(OPEN)} for update`;
    if (!app) return false;
    const answer = app.status === "need_info";
    // Пока ждали ответа, срок стоял: сдвигаем его на дни паузы
    if (answer)
      await tx`update applications set status = 'in_progress', updated_at = now(),
        due_date = due_date + greatest(0, current_date - coalesce(
          (select max(created_at)::date from application_events where application_id = ${appId} and kind = 'question'), current_date))
        where id = ${appId}`;
    await tx`insert into application_events (application_id, kind, text, author_id) values (${appId}, ${answer ? "answer" : "message"}, ${t}, ${user.id})`;
    return true;
  });
  if (!sent) return { error: "Заявка уже закрыта, переписка завершена." };
  refresh();
  return {};
}

/** Студент отменил заявку. Только свою и только пока её не закрыли. */
export async function cancelApplication(appId: string): Promise<{ error?: string }> {
  const user = await requireStudent();
  if (!UUID.test(String(appId))) return { error: "Заявка не найдена." };
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
  if (!UUID.test(String(appId))) return;
  await sql`
    update application_events e set read_at = now()
    from applications a
    where e.application_id = a.id and a.id = ${appId} and a.user_id = ${user.id}
      and e.kind in ${sql(NOTICE_KINDS)} and e.read_at is null`;
  refresh();
}
