"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { UUID, dueDate } from "@/lib/applications";
import { DOC_TYPES, PURPOSES, isDocType } from "@/lib/documents";

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

/** Ответ на вопрос деканата. Заявка возвращается в работу. */
export async function answerQuestion(appId: string, text: string): Promise<{ error?: string }> {
  const user = await requireStudent();
  const t = String(text ?? "").trim();
  if (!UUID.test(String(appId))) return { error: "Заявка не найдена." };
  if (!t) return { error: "Напишите ответ." };
  if (t.length > 1000) return { error: "Слишком длинный ответ. Сократите до 1000 знаков." };

  const [app] = await sql<{ id: string }[]>`
    update applications set status = 'in_progress', updated_at = now()
    where id = ${appId} and user_id = ${user.id} and status = 'need_info'
    returning id`;
  if (!app) return { error: "На этот вопрос уже ответили или заявка закрыта." };
  await sql`insert into application_events (application_id, kind, text, author_id) values (${app.id}, 'answer', ${t}, ${user.id})`;
  return {};
}
