"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { createSession, destroySession, releaseLoginAttempt, reserveLoginAttempt } from "@/lib/auth";

export type LoginState = { error?: string; login?: string };

const WRONG = "Неверный логин или пароль";
// Хеш случайной строки: сравниваем с ним, когда логина нет, чтобы время ответа не выдавало, существует ли логин.
const DUMMY_HASH = "$2b$12$sggoPd7MR8LujBH0pxEEK.7USD4m4iNpS65XtIodW3YdzKAmIYIEa";
// Сравнение пароля считается в общем потоке сервера. Больше четырёх одновременно не запускаем,
// чтобы пачка запросов на вход не останавливала страницы остальных.
const MAX_HASHING = 4;
let hashing = 0;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  // Телефон часто ставит заглавную букву и пробел в конце. Логин сравниваем без регистра и пробелов.
  const loginValue = String(form.get("login") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!loginValue || !password) return { error: "Введите логин и пароль", login: loginValue };
  if (loginValue.length > 64 || password.length > 128) return { error: WRONG, login: loginValue };

  // Попытка записывается до проверки пароля: одновременные запросы не проходят сверх лимита
  const attempt = await reserveLoginAttempt(loginValue);
  if (!attempt) return { error: "Слишком много попыток. Подождите 15 минут и попробуйте снова", login: loginValue };
  if (hashing >= MAX_HASHING) {
    await releaseLoginAttempt(attempt);
    return { error: "Сервер занят. Попробуйте ещё раз через несколько секунд", login: loginValue };
  }

  hashing++;
  let user: { id: string; role: string; password_hash: string } | undefined;
  let ok = false;
  try {
    [user] = await sql<{ id: string; role: string; password_hash: string }[]>`
      select id, role, password_hash from users where login = ${loginValue}`;
    ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  } finally {
    hashing--;
  }
  // Неудачная попытка остаётся записанной и идёт в счёт лимита
  if (!user || !ok) return { error: WRONG, login: loginValue };

  await releaseLoginAttempt(attempt);
  await createSession(user.id);
  redirect(user.role === "staff" ? "/staff" : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
