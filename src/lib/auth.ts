import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { sql } from "./db";

import { SESSION_COOKIE } from "./session-cookie";

const SESSION_DAYS = 30;
const MAX_SESSIONS = 50; // на один аккаунт: тестовые аккаунты общие, но таблица не должна расти без предела
const MAX_FAILS = 10; // неудач за 15 минут на один логин с одного адреса
const MAX_PER_IP = 50; // попыток за 15 минут с одного адреса на все логины

export type CurrentUser = {
  id: string;
  role: "student" | "staff";
  lastName: string;
  firstName: string;
  middleName: string | null;
  faculty: string | null;
  program: string | null;
  course: number | null;
  groupName: string | null;
  studentCard: string | null;
  avatar: string | null; // ключ из src/lib/avatars.ts, null — инициалы
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Текущий пользователь по cookie или null. Один запрос к базе на запрос страницы. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [user] = await sql<CurrentUser[]>`
    select u.id, u.role, u.avatar, u.last_name as "lastName", u.first_name as "firstName", u.middle_name as "middleName",
           st.faculty, st.program, st.course, st.group_name as "groupName", st.student_card as "studentCard"
    from sessions s
    join users u on u.id = s.user_id
    left join students st on st.user_id = u.id
    where s.id = ${sha256(token)} and s.expires_at > now()`;
  return user ?? null;
});

/** Пускает только студента. Без сессии на вход, сотрудника в его кабинет. */
export async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/staff");
  return user;
}

/** Пускает только сотрудника. Студенту «не найдено», чтобы не выдавать, что раздел существует. */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "staff") notFound();
  return user;
}

/** Любой вошедший (студент или сотрудник): для настроек своей учётной записи, например аватарки. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await sql`insert into sessions (id, user_id, expires_at)
            values (${sha256(token)}, ${userId}, now() + make_interval(days => ${SESSION_DAYS}))`;
  // Просроченные сессии и лишние сверх предела убираем при входе, а не только при старте сервера
  await sql`delete from sessions where expires_at < now() or (user_id = ${userId} and id not in (
    select id from sessions where user_id = ${userId} order by expires_at desc limit ${MAX_SESSIONS}))`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sql`delete from sessions where id = ${sha256(token)}`;
  jar.delete(SESSION_COOKIE);
}

// Адрес клиента ставит Caddy в X-Forwarded-For. Берём последний, его добавил наш прокси.
async function clientIp() {
  const xff = (await headers()).get("x-forwarded-for");
  return xff?.split(",").pop()?.trim() || "local";
}

// ponytail: лимит попыток в таблице, без Redis. Хватает на несколько копий приложения с общей базой.
/**
 * Занять попытку входа до проверки пароля. Запись появляется раньше сравнения, поэтому одновременные
 * запросы видят друг друга и не проходят сверх лимита. Считаем по паре «адрес, логин»: чужие ошибки
 * с того же адреса (общий Wi-Fi, одна сеть у жюри) не закрывают вход в другой аккаунт.
 * Возвращает номер попытки или null, если лимит исчерпан.
 */
export async function reserveLoginAttempt(login: string) {
  const ip = await clientIp();
  const [{ id }] = await sql<{ id: string }[]>`insert into login_attempts (ip, login) values (${ip}, ${login}) returning id::text`;
  // Отдельным запросом после вставки: так видны попытки, записанные другими запросами в тот же момент
  const [n] = await sql<{ by_login: number; by_ip: number }[]>`
    select count(*) filter (where login = ${login})::int as by_login, count(*)::int as by_ip
    from login_attempts where ip = ${ip} and created_at > now() - interval '15 minutes'`;
  if (n.by_login <= MAX_FAILS && n.by_ip <= MAX_PER_IP) return id;
  await releaseLoginAttempt(id); // отказ не продлевает блокировку
  return null;
}

/** Попытка не была неудачей (верный пароль или отказ до проверки): убираем её из счёта. */
export async function releaseLoginAttempt(id: string) {
  await sql`delete from login_attempts where id = ${id}`;
}
