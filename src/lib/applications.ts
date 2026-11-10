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
/** Номер заявки из запроса: только строка нужного вида. Массив или объект с таким же видом в строке не проходит. */
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

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
  holder?: string[] | null; // [фамилия, имя, отчество] на момент выдачи справки
};
export type EventRow = { application_id: string; kind: AppEvent["kind"]; text: string | null; read_at: Date | null; seen_at: Date | null; created_at: Date };

/** События по заявкам за один проход, чтобы список не перебирал все события для каждой заявки. */
export function groupEvents(all: EventRow[]) {
  const byApp = new Map<string, EventRow[]>();
  for (const e of all) {
    const list = byApp.get(e.application_id);
    if (list) list.push(e);
    else byApp.set(e.application_id, [e]);
  }
  return byApp;
}

/** events: события только этой заявки. */
export function toApplication(r: AppRow, events: EventRow[]): Application {
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
    holder: r.holder?.filter(Boolean).join(" ") || undefined,
    details: r.details ?? undefined,
    events: events.map((e) => ({ at: fmtAt(e.created_at), kind: e.kind, text: e.text ?? undefined, read: e.read_at ? true : undefined, seen: e.seen_at ? true : undefined })),
  };
}

// Один параметр-массив вместо параметра на каждую заявку: у драйвера предел 65534 параметра на запрос
export async function eventsFor(ids: string[]) {
  if (ids.length === 0) return [];
  return sql<EventRow[]>`
    select application_id, kind, text, read_at, seen_at, created_at from application_events
    where application_id = any(${ids}::uuid[]) order by created_at, id`;
}

/** Все заявки текущего студента, новые сверху. */
export async function listMyApplications() {
  const user = await requireStudent();
  const rows = await sql<AppRow[]>`
    select id, number, type, purpose, format, details, status, due_date, verify_code
    from applications where user_id = ${user.id} order by created_at desc`;
  const events = groupEvents(await eventsFor(rows.map((r) => r.id)));
  return rows.map((r) => toApplication(r, events.get(r.id) ?? []));
}

/** Одна заявка текущего студента. Чужая, несуществующая или кривой адрес: «не найдено». */
export async function getMyApplication(id: string) {
  if (!UUID.test(id)) notFound();
  const user = await requireStudent();
  const [row] = await sql<AppRow[]>`
    select id, number, type, purpose, format, details, status, due_date, verify_code, holder
    from applications where id = ${id} and user_id = ${user.id}`;
  if (!row) notFound();
  return { app: toApplication(row, await eventsFor([row.id])), user };
}

/**
 * Адрес сайта для ссылок в QR-коде: за Caddy берём заголовки прокси, но не верим им на слово.
 * На сервере хост должен быть одним из адресов в DOMAIN, иначе берём первый из них. Локально (DOMAIN не задан)
 * принимаем только обычное имя хоста и схему http или https.
 */
export async function siteOrigin() {
  const h = await headers();
  const allowed = (process.env.DOMAIN ?? "").split(/[\s,]+/).filter(Boolean);
  const asked = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (allowed.length > 0) return `https://${allowed.includes(asked) ? asked : allowed[0]}`;
  const host = /^[a-z0-9.-]+(:\d{1,5})?$/.test(asked) ? asked : "localhost:3000";
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Публичная проверка по QR: только тип, номер, дата и имя в виде «Соколова А. Д.».
 * Имя берётся на момент выдачи (holder), а не из текущего профиля: после исправления ФИО старая ссылка
 * не раскрывает новое имя. У справок, выданных до появления holder, имя из профиля.
 */
export async function findByVerifyCode(code: string) {
  if (!/^[0-9a-f]{32}$/.test(code)) return null;
  const [row] = await sql<{ number: number; type: DocType; holder: string[]; issued_at: Date | null }[]>`
    select a.number, a.type, coalesce(a.holder, array[u.last_name, u.first_name, coalesce(u.middle_name, '')]) as holder,
           (select max(e.created_at) from application_events e where e.application_id = a.id and e.kind = 'ready') as issued_at
    from applications a join users u on u.id = a.user_id
    where a.verify_code = ${code} and a.status = 'ready'`;
  if (!row) return null;
  const [last, ...rest] = row.holder;
  const initials = rest.filter(Boolean).map((n) => `${n[0]}.`).join(" ");
  return { number: row.number, type: row.type, holder: `${last} ${initials}`, issued: row.issued_at ? fmtDay(row.issued_at) : "" };
}

/** Аватарка сотрудника деканата для переписки у студента. Только ключ из набора значков, не личные данные. */
export async function deanAvatar() {
  const [row] = await sql<{ avatar: string | null }[]>`select avatar from users where role = 'staff' order by created_at limit 1`;
  return row?.avatar ?? null;
}

/**
 * Отпечаток заявки для живого обновления: статус, число событий и отметок прочтения.
 * Меняется, когда пришло сообщение, сменился статус или другая сторона прочитала.
 * owner: номер студента (только его заявка) или явное "staff" после requireStaff(). Пустое значение ничего не открывает.
 */
export async function fingerprint(appId: unknown, owner: string) {
  if (!isUuid(appId) || !owner) return "";
  const [r] = await sql<{ v: string }[]>`
    select concat_ws('|', a.status, count(e.id), count(e.seen_at), count(e.read_at)) as v
    from applications a left join application_events e on e.application_id = a.id
    where a.id = ${appId} ${owner === "staff" ? sql`` : sql`and a.user_id = ${owner}`}
    group by a.id, a.status`;
  return r?.v ?? "";
}
