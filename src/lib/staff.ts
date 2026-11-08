import "server-only";
import { notFound } from "next/navigation";
import { sql } from "./db";
import { requireStaff } from "./auth";
import { UUID, eventsFor, fmtAt, toApplication, type AppRow } from "./applications";
import { isClosed, type Application } from "./documents";

// Данные кабинета сотрудника. Каждая функция сначала проверяет роль: студент получает «не найдено».

type StaffRow = AppRow & {
  copies: number;
  created_at: Date;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  group_name: string | null;
  faculty: string | null;
  course: number | null;
  student_card: string | null;
  unread: number;
  avatar: string | null;
};

export type QueueItem = {
  app: Application;
  student: { short: string; full: string; name: string; initials: string; avatar: string | null; group: string; faculty: string; course: number | null; card: string };
  createdAt: string;
  copies: number;
  overdue: boolean;
  unread: number;
};

const today = () => new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date()));

function toItem(r: StaffRow, app: Application): QueueItem {
  const initials = [r.first_name, r.middle_name].filter(Boolean).map((n) => `${n![0]}.`).join(" ");
  const open = !isClosed(r.status);
  return {
    app,
    student: {
      short: `${r.last_name} ${initials}`,
      full: `${r.last_name} ${r.first_name} ${r.middle_name ?? ""}`.trim(),
      name: `${r.last_name} ${r.first_name}`,
      initials: `${r.last_name[0]}${r.first_name[0]}`,
      avatar: r.avatar,
      group: r.group_name ?? "",
      faculty: r.faculty ?? "",
      course: r.course,
      card: r.student_card ?? "",
    },
    createdAt: fmtAt(r.created_at),
    copies: r.copies,
    overdue: open && new Date(r.due_date).getTime() < today().getTime(),
    unread: r.unread,
  };
}

const SELECT = sql`
  select a.id, a.number, a.type, a.purpose, a.format, a.details, a.status, a.due_date, a.verify_code, a.copies, a.created_at,
         u.last_name, u.first_name, u.middle_name, u.avatar, st.group_name, st.faculty, st.course, st.student_card,
         (select count(*) from application_events e
           where e.application_id = a.id and e.kind in ('answer', 'message') and e.read_at is null)::int as unread
  from applications a
  join users u on u.id = a.user_id
  left join students st on st.user_id = u.id`;

/** Очередь: все заявки всех студентов, сначала с ближайшим сроком. */
export async function listQueue() {
  await requireStaff();
  const rows = await sql<StaffRow[]>`${SELECT} order by a.due_date, a.created_at`;
  const events = await eventsFor(rows.map((r) => r.id));
  return rows.map((r) => toItem(r, toApplication(r, events)));
}

/** Одна заявка для сотрудника, со сведениями о студенте. */
export async function getForStaff(id: string) {
  if (!UUID.test(id)) notFound();
  await requireStaff();
  const [row] = await sql<StaffRow[]>`${SELECT} where a.id = ${id}`;
  if (!row) notFound();
  return toItem(row, toApplication(row, await eventsFor([row.id])));
}

