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
`;

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
  console.log("[init-db] схема и демо-данные готовы");
}
