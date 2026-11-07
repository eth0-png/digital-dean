import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { sql } from "./db";

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;
const MAX_FAILS = 10; // за 15 минут с одного адреса

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
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Текущий пользователь по cookie или null. Один запрос к базе на запрос страницы. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [user] = await sql<CurrentUser[]>`
    select u.id, u.role, u.last_name as "lastName", u.first_name as "firstName", u.middle_name as "middleName",
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

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await sql`insert into sessions (id, user_id, expires_at)
            values (${sha256(token)}, ${userId}, now() + make_interval(days => ${SESSION_DAYS}))`;
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

// ponytail: лимит попыток по IP в таблице, без Redis. Хватает на несколько копий приложения с общей базой.
export async function isRateLimited() {
  const ip = await clientIp();
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from login_attempts
    where ip = ${ip} and created_at > now() - interval '15 minutes'`;
  return n >= MAX_FAILS;
}

export async function recordFailedLogin() {
  await sql`insert into login_attempts (ip) values (${await clientIp()})`;
}
