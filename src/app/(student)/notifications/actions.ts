"use server";

import { refresh } from "next/cache";
import { sql } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { NOTICE_KINDS } from "@/lib/notifications";

/**
 * Студент открыл уведомления: всё прочитано, счётчик на колокольчике гаснет.
 * refresh() перерисовывает и шапку: при переходах между страницами она сама не обновляется.
 */
export async function markAllNoticesRead() {
  const user = await requireStudent();
  await sql`
    update application_events e set read_at = now()
    from applications a
    where e.application_id = a.id and a.user_id = ${user.id}
      and e.kind in ${sql(NOTICE_KINDS)} and e.read_at is null`;
  refresh();
}
