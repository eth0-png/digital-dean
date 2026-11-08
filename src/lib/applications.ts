import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { sql } from "./db";
import { requireStudent } from "./auth";
import { plural, type AppEvent, type AppStatus, type Application, type DocType, type Format } from "./documents";

// Слой данных «Документов». Студент получает заявку только с условием user_id = он сам.
// Чужая или несуществующая заявка одинаково отвечает «не найдено».

const TZ = "Europe/Moscow";
const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }); // ГГГГ-ММ-ДД
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ });

export const fmtDay = (d: Date) => dayFmt.format(d);
export const fmtAt = (d: Date) => `${dayFmt.format(d)}, ${timeFmt.format(d)}`;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Срок готовности: столько-то рабочих дней от сегодня (без праздников, ponytail: добавить календарь, если понадобится). */
export function dueDate(days: number) {
  let d = new Date();
  for (let left = days; left > 0; ) {
    d = new Date(d.getTime() + 86_400_000);
    const wd = weekdayFmt.format(d);
    if (wd !== "Sat" && wd !== "Sun") left--;
  }
  return isoFmt.format(d);
}

export type AppRow = {
  id: string;
  number: number;
  type: DocType;
  purpose: string | null;
  format: Format;
  details: string | null;
  status: AppStatus;
  due_date: Date;
  verify_code: string | null;
};
export type EventRow = { application_id: string; kind: AppEvent["kind"]; text: string | null; read_at: Date | null; created_at: Date };

export function toApplication(r: AppRow, all: EventRow[]): Application {
  const events = all.filter((e) => e.application_id === r.id);
  const ready = events.findLast((e) => e.kind === "ready");
  const due = new Date(r.due_date); // драйвер может вернуть дату и строкой, и объектом
  let readyAt: string | undefined;
  if (ready) {
    const early = Math.floor((due.getTime() - new Date(isoFmt.format(ready.created_at)).getTime()) / 86_400_000);
    readyAt = `${fmtDay(ready.created_at)} в ${timeFmt.format(ready.created_at)}`;
    if (early > 0) readyAt += `, на ${early === 1 ? "день" : `${early} ${plural(early, "день", "дня", "дней")}`} раньше срока`;
  }
  return {
    id: r.id,
    number: r.number,
    type: r.type,
    purpose: r.purpose ?? "",
    format: r.format,
    status: r.status,
    due: fmtDay(due),
    readyAt,
    closedAt: (() => {
      const closed = events.findLast((e) => e.kind === "rejected" || e.kind === "cancelled");
      return closed ? fmtDay(closed.created_at) : undefined;
    })(),
    question: r.status === "need_info" ? (events.findLast((e) => e.kind === "question")?.text ?? undefined) : undefined,
    verifyCode: r.verify_code ?? undefined,
    details: r.details ?? undefined,
    events: events.map((e) => ({ at: fmtAt(e.created_at), kind: e.kind, text: e.text ?? undefined, read: e.read_at ? true : undefined })),
  };
}

export async function eventsFor(ids: string[]) {
  if (ids.length === 0) return [];
  return sql<EventRow[]>`
    select application_id, kind, text, read_at, created_at from application_events
    where application_id in ${sql(ids)} order by created_at, id`;
}

/** Все заявки текущего студента, новые сверху. */
export async function listMyApplications() {
  const user = await requireStudent();
  const rows = await sql<AppRow[]>`
    select id, number, type, purpose, format, details, status, due_date, verify_code
    from applications where user_id = ${user.id} order by created_at desc`;
  const events = await eventsFor(rows.map((r) => r.id));
  return rows.map((r) => toApplication(r, events));
}

/** Одна заявка текущего студента. Чужая, несуществующая или кривой адрес: «не найдено». */
export async function getMyApplication(id: string) {
  if (!UUID.test(id)) notFound();
  const user = await requireStudent();
  const [row] = await sql<AppRow[]>`
    select id, number, type, purpose, format, details, status, due_date, verify_code
    from applications where id = ${id} and user_id = ${user.id}`;
  if (!row) notFound();
  return { app: toApplication(row, await eventsFor([row.id])), user };
}

/** Адрес сайта для ссылок в QR-коде: за Caddy берём заголовки прокси. */
export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Публичная проверка по QR: только тип, номер, дата и имя в виде «Соколова А. Д.». */
export async function findByVerifyCode(code: string) {
  if (!/^[0-9a-f]{32}$/.test(code)) return null;
  const [row] = await sql<{ number: number; type: DocType; last_name: string; first_name: string; middle_name: string | null; issued_at: Date | null }[]>`
    select a.number, a.type, u.last_name, u.first_name, u.middle_name,
           (select max(e.created_at) from application_events e where e.application_id = a.id and e.kind = 'ready') as issued_at
    from applications a join users u on u.id = a.user_id
    where a.verify_code = ${code} and a.status = 'ready'`;
  if (!row) return null;
  const initials = [row.first_name, row.middle_name].filter(Boolean).map((n) => `${n![0]}.`).join(" ");
  return { number: row.number, type: row.type, holder: `${row.last_name} ${initials}`, issued: row.issued_at ? fmtDay(row.issued_at) : "" };
}

/** Аватарка сотрудника деканата для переписки у студента. Только ключ из набора значков, не личные данные. */
export async function deanAvatar() {
  const [row] = await sql<{ avatar: string | null }[]>`select avatar from users where role = 'staff' order by created_at limit 1`;
  return row?.avatar ?? null;
}
