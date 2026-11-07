import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "./db";

// ponytail: схема идемпотентным SQL при старте вместо миграций. Перейти на миграции, если таблицы начнут часто меняться.
const SCHEMA = `
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  login text not null unique,
  password_hash text not null,
  role text not null check (role in ('student', 'staff')),
  last_name text not null,
  first_name text not null,
  middle_name text,
  created_at timestamptz not null default now()
);

create table if not exists students (
  user_id uuid primary key references users(id) on delete cascade,
  faculty text not null,
  program text not null,
  course int not null check (course between 1 and 6),
  group_name text not null,
  student_card text not null
);

-- В базе только SHA-256 от токена. Сам токен живёт в cookie браузера.
create table if not exists sessions (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists login_attempts (
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_ip_idx on login_attempts (ip, created_at);

-- Заявки студентов. Номер для людей, id (uuid) для адресов, чтобы номера нельзя было перебрать.
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  number int generated always as identity (start with 2401) unique,
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('study', 'military', 'retake', 'data_fix')),
  purpose text,
  format text not null default 'electronic' check (format in ('electronic', 'paper')),
  copies int not null default 1 check (copies between 1 and 5),
  details text check (length(details) <= 1000),
  status text not null default 'submitted',
  due_date date not null,
  verify_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_user_idx on applications (user_id, created_at desc);

-- История заявки: этапы, вопросы деканата и ответы студента.
create table if not exists application_events (
  id bigserial primary key,
  application_id uuid not null references applications(id) on delete cascade,
  kind text not null,
  text text check (length(text) <= 1000),
  author_id uuid references users(id),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists application_events_app_idx on application_events (application_id, created_at);

-- Прочитанные уведомления без своей строки в базе: изменения расписания считаются от текущей даты.
create table if not exists notice_reads (
  user_id uuid not null references users(id) on delete cascade,
  key text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Допустимые значения отдельно от таблиц, чтобы новые статусы доходили и до уже созданной базы.
-- cancelled: студент отменил заявку. reply: сообщение деканата в переписке без паузы заявки.
alter table applications drop constraint if exists applications_status_check;
alter table applications add constraint applications_status_check
  check (status in ('submitted', 'in_progress', 'need_info', 'ready', 'rejected', 'cancelled'));
alter table application_events drop constraint if exists application_events_kind_check;
alter table application_events add constraint application_events_kind_check
  check (kind in ('submitted', 'in_progress', 'question', 'answer', 'message', 'reply', 'ready', 'rejected', 'cancelled'));
`;

// Демо-заявки, чтобы жюри сразу увидело все состояния. Создаются один раз, если у студента заявок нет,
// и дальше не трогаются: заявки, которые создаст жюри, сохраняются.
type DemoEvent = { kind: string; after: string; text?: string; read?: boolean };
type DemoApp = { type: string; purpose?: string; format: string; details?: string; status: string; ago: string; due: string; events: DemoEvent[] };

const DEMO_APPS: Record<string, DemoApp[]> = {
  student1: [
    {
      type: "military", format: "paper", status: "ready", ago: "6 days", due: "2 days",
      events: [{ kind: "submitted", after: "0" }, { kind: "in_progress", after: "3 hours" }, { kind: "ready", after: "1 day 5 hours" }],
    },
    {
      type: "retake", format: "electronic", status: "need_info", ago: "1 day", due: "3 days", details: "Макроэкономика, удобно на следующей неделе",
      events: [
        { kind: "submitted", after: "0" },
        { kind: "question", after: "2 hours", text: "Пересдача по макроэкономике возможна 18 или 20 ноября. Какая дата вам удобнее?" },
      ],
    },
    {
      type: "study", purpose: "На работу", format: "electronic", status: "in_progress", ago: "3 hours", due: "1 day",
      events: [{ kind: "submitted", after: "0" }, { kind: "in_progress", after: "40 minutes" }],
    },
  ],
  student2: [
    {
      type: "study", purpose: "В соцзащиту", format: "electronic", status: "ready", ago: "2 days", due: "1 day",
      events: [
        { kind: "submitted", after: "0" },
        { kind: "question", after: "1 hour", text: "Справка в соцзащиту нужна с отметкой о форме обучения?" },
        { kind: "answer", after: "1 hour 20 minutes", text: "Да, с отметкой, что очная", read: true },
        { kind: "in_progress", after: "2 hours" },
        { kind: "ready", after: "1 day 4 hours" },
      ],
    },
    {
      type: "data_fix", format: "electronic", status: "submitted", ago: "30 minutes", due: "2 days", details: "В профиле неверная группа: я в МИЭП-12, а не МИЭП-11",
      events: [{ kind: "submitted", after: "0" }],
    },
  ],
};

async function seedApplications(userId: string, login: string, staffId: string | undefined) {
  const apps = DEMO_APPS[login];
  if (!apps) return;
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from applications where user_id = ${userId}`;
  if (n > 0) return;
  for (const a of apps) {
    const code = a.status === "ready" ? randomBytes(16).toString("hex") : null;
    // Демо-события в рабочие часы деканата: день «ago» назад с 10:00 по Москве, но не позже текущего момента
    const base = sql`((date_trunc('day', (now() - ${a.ago}::interval) at time zone 'Europe/Moscow') + interval '10 hours') at time zone 'Europe/Moscow')`;
    const [app] = await sql<{ id: string }[]>`
      insert into applications (user_id, type, purpose, format, details, status, due_date, verify_code, created_at, updated_at)
      values (${userId}, ${a.type}, ${a.purpose ?? null}, ${a.format}, ${a.details ?? null}, ${a.status},
              (now() - ${a.ago}::interval + ${a.due}::interval)::date, ${code}, least(${base}, now()), now())
      returning id`;
    for (const e of a.events) {
      const author = e.kind === "question" ? (staffId ?? null) : e.kind === "answer" ? userId : null;
      await sql`
        insert into application_events (application_id, kind, text, author_id, read_at, created_at)
        values (${app.id}, ${e.kind}, ${e.text ?? null}, ${author},
                ${e.read ? sql`least(${base} + ${e.after}::interval, now())` : null},
                least(${base} + ${e.after}::interval, now()))`;
    }
  }
}

// Вымышленные люди. Пароли только из переменных окружения, в репозитории их нет.
const DEMO = [
  {
    login: "student1",
    env: "SEED_PASSWORD_STUDENT1",
    role: "student",
    name: ["Соколова", "Анна", "Дмитриевна"],
    student: {
      faculty: "Международно-правовой факультет",
      program: "Юриспруденция (международное право)",
      course: 3,
      group: "МП-31",
      card: "21-0457",
    },
  },
  {
    login: "student2",
    env: "SEED_PASSWORD_STUDENT2",
    role: "student",
    name: ["Петров", "Илья", "Сергеевич"],
    student: {
      faculty: "Международный институт энергетической политики и дипломатии",
      program: "Экономика (международный энергетический бизнес)",
      course: 1,
      group: "МИЭП-12",
      card: "25-1182",
    },
  },
  {
    login: "dekanat",
    env: "SEED_PASSWORD_STAFF",
    role: "staff",
    name: ["Ковалёва", "Марина", "Викторовна"],
    student: null,
  },
] as const;

export async function initDb() {
  await sql.unsafe(SCHEMA);
  await sql`delete from sessions where expires_at < now()`;
  await sql`delete from login_attempts where created_at < now() - interval '1 day'`;

  const ids: Record<string, string> = {};
  for (const d of DEMO) {
    const password = process.env[d.env];
    if (!password) {
      console.warn(`[init-db] ${d.env} не задан, аккаунт ${d.login} не обновлён`);
      continue;
    }
    const hash = await bcrypt.hash(password, 12);
    const [last, first, middle] = d.name;
    const [user] = await sql<{ id: string }[]>`
      insert into users (login, password_hash, role, last_name, first_name, middle_name)
      values (${d.login}, ${hash}, ${d.role}, ${last}, ${first}, ${middle})
      on conflict (login) do update set
        password_hash = excluded.password_hash, role = excluded.role,
        last_name = excluded.last_name, first_name = excluded.first_name, middle_name = excluded.middle_name
      returning id`;
    ids[d.login] = user.id;
    if (d.student) {
      const s = d.student;
      await sql`
        insert into students (user_id, faculty, program, course, group_name, student_card)
        values (${user.id}, ${s.faculty}, ${s.program}, ${s.course}, ${s.group}, ${s.card})
        on conflict (user_id) do update set
          faculty = excluded.faculty, program = excluded.program, course = excluded.course,
          group_name = excluded.group_name, student_card = excluded.student_card`;
    }
  }
  for (const login of Object.keys(DEMO_APPS)) if (ids[login]) await seedApplications(ids[login], login, ids.dekanat);
  console.log("[init-db] схема и демо-данные готовы");
}
