import "server-only";
import { sql } from "./db";
import { requireStudent } from "./auth";
import { fmtAt } from "./applications";
import { DOC_TYPES, isCertificate, type AppEvent, type AppStatus, type DocType } from "./documents";
import { scheduleNotices } from "./schedule";
import { studyNotices } from "./grades";

// Уведомления студента: что сделал деканат по заявкам, изменения в расписании, оценки, сроки и объявления деканата.
// Уведомление о заявке это её событие, «прочитано» это read_at у события. Остальное считается от даты
// (расписание, оценки текущей аттестации, сроки), поэтому их «прочитано» лежит в notice_reads по ключу.

export const NOTICE_KINDS: AppEvent["kind"][] = ["in_progress", "question", "reply", "ready", "rejected"];

export type Notice = {
  id: string;
  kind: AppEvent["kind"] | "moved" | "cancelled" | "room" | "grade" | "debt" | "deadline" | "announce";
  title: string;
  text?: string;
  about: string;
  at: string;
  href: string;
  unread: boolean;
  needAnswer: boolean;
  ts: number;
};

type Row = { id: string; kind: AppEvent["kind"]; text: string | null; read_at: Date | null; created_at: Date; app_id: string; number: number; type: DocType; status: AppStatus };

function title(r: Row) {
  if (r.kind === "ready") return isCertificate(r.type) ? "Справка готова" : "Заявка выполнена";
  return { in_progress: "Заявку взяли в работу", question: "Деканат задал вопрос", reply: "Новое сообщение от деканата", rejected: "Заявка отклонена" }[r.kind as string] ?? "";
}

/** Лента текущего студента, новые сверху. Только его заявки: фильтр по user_id из сессии. */
export async function listMyNotices(): Promise<Notice[]> {
  const user = await requireStudent();
  const rows = await sql<Row[]>`
    select e.id::text as id, e.kind, e.text, e.read_at, e.created_at, a.id as app_id, a.number, a.type, a.status
    from application_events e join applications a on a.id = e.application_id
    where a.user_id = ${user.id} and e.kind in ${sql(NOTICE_KINDS)}
    order by e.created_at desc, e.id desc
    limit 50`;
  // Ответа ждёт только последний вопрос по заявке, которая всё ещё на уточнении
  const asked = new Set<string>();
  const apps = rows.map((r): Notice => {
    const needAnswer = r.kind === "question" && r.status === "need_info" && !asked.has(r.app_id);
    if (r.kind === "question") asked.add(r.app_id);
    return {
      id: r.id,
      kind: r.kind,
      title: title(r),
      text: r.text ?? undefined,
      about: `${DOC_TYPES[r.type].title}, № ${r.number}`,
      at: fmtAt(r.created_at),
      href: `/documents/${r.app_id}`,
      unread: !r.read_at,
      needAnswer,
      ts: r.created_at.getTime(),
    };
  });
  const keyed = keyedNotices(user.groupName ?? "");
  const read = await readKeys(user.id, keyed.map((n) => n.key));
  const others = keyed.map(
    (n): Notice => ({ id: n.key, kind: n.kind, title: n.title, text: n.text, about: n.about, at: fmtAt(n.at), href: n.href, unread: !read.has(n.key), needAnswer: false, ts: n.at.getTime() }),
  );
  return [...apps, ...others].sort((a, b) => b.ts - a.ts);
}

/** Уведомления без своей строки в базе: расписание, учёба, объявления. */
function keyedNotices(group: string) {
  return [
    ...scheduleNotices(group).map((n) => ({ ...n, about: "Расписание" })),
    ...studyNotices(group).map((n) => ({ ...n, about: n.kind === "announce" ? "Деканат" : "Учёба" })),
  ];
}

async function readKeys(userId: string, keys: string[]) {
  if (keys.length === 0) return new Set<string>();
  const rows = await sql<{ key: string }[]>`select key from notice_reads where user_id = ${userId} and key in ${sql(keys)}`;
  return new Set(rows.map((r) => r.key));
}

/** Ключи уведомлений без своей строки в базе: отметить прочитанными вместе с остальной лентой. */
export function keyedNoticeKeys(group: string) {
  return keyedNotices(group).map((n) => n.key);
}

/** Сколько непрочитанных, для счётчика на колокольчике. */
export async function countMyUnread() {
  const user = await requireStudent();
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n
    from application_events e join applications a on a.id = e.application_id
    where a.user_id = ${user.id} and e.kind in ${sql(NOTICE_KINDS)} and e.read_at is null`;
  const keys = keyedNoticeKeys(user.groupName ?? "");
  const read = await readKeys(user.id, keys);
  return n + keys.filter((k) => !read.has(k)).length;
}
