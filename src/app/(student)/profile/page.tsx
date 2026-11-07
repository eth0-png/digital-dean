import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { btn, card, PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Профиль" };

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const u = await requireStudent();
  const rows: [string, string][] = [
    ["Факультет", u.faculty ?? ""],
    ["Направление", u.program ?? ""],
    ["Курс", `${u.course}`],
    ["Группа", u.groupName ?? ""],
    ["Студенческий билет", u.studentCard ?? ""],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#FFD0A8] to-[#FF8FB1] text-xl font-extrabold text-[#5A1934]">
          {u.firstName[0]}
          {u.lastName[0]}
        </div>
        <div>
          <h1 className="font-display text-xl leading-tight font-semibold">
            {u.lastName} {u.firstName}
          </h1>
          {u.middleName && <p className="text-muted">{u.middleName}</p>}
        </div>
      </div>

      <dl className={`${card} divide-y divide-line py-1`}>
        {rows.map(([k, v]) => (
          <div key={k} className="py-3">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="mt-0.5 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <form action={logout}>
        <button type="submit" className={btn.secondary}>
          <LogOut size={20} aria-hidden="true" />
          Выйти
        </button>
      </form>
    </div>
  );
}
