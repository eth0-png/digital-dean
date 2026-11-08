"use server";

import { refresh } from "next/cache";
import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isAvatarKey } from "@/lib/avatars";

/**
 * Выбор аватарки для своей учётной записи (студент или сотрудник). Только ключ из набора,
 * чужую учётную запись не изменить: id берётся из сессии. null — вернуть инициалы.
 */
export async function setAvatar(key: string | null): Promise<{ error?: string }> {
  const user = await requireUser();
  if (key !== null && !isAvatarKey(key)) return { error: "Такой аватарки нет." };
  await sql`update users set avatar = ${key} where id = ${user.id}`;
  refresh();
  return {};
}
