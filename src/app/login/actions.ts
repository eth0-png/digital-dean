"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { createSession, destroySession, isRateLimited, recordFailedLogin } from "@/lib/auth";

export type LoginState = { error?: string; login?: string };

const WRONG = "Неверный логин или пароль";
// Хеш случайной строки: сравниваем с ним, когда логина нет, чтобы время ответа не выдавало, существует ли логин.
const DUMMY_HASH = "$2b$12$sggoPd7MR8LujBH0pxEEK.7USD4m4iNpS65XtIodW3YdzKAmIYIEa";

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  // Телефон часто ставит заглавную букву и пробел в конце. Логин сравниваем без регистра и пробелов.
  const loginValue = String(form.get("login") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!loginValue || !password) return { error: "Введите логин и пароль", login: loginValue };
  if (loginValue.length > 64 || password.length > 128) return { error: WRONG, login: loginValue };

  if (await isRateLimited()) {
    return { error: "Слишком много попыток. Подождите 15 минут и попробуйте снова", login: loginValue };
  }

  const [user] = await sql<{ id: string; role: string; password_hash: string }[]>`
    select id, role, password_hash from users where login = ${loginValue}`;
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    await recordFailedLogin();
    return { error: WRONG, login: loginValue };
  }

  await createSession(user.id);
  redirect(user.role === "staff" ? "/staff" : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
