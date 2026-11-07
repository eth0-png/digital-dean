import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { PageTransition, Reveal, stagger } from "@/components/kit";

export const metadata: Metadata = { title: "Профиль" };

export default function ProfilePage() {
  return (
    <PageTransition>
      <Reveal>
        <Profile />
      </Reveal>
    </PageTransition>
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
      <div className="enter flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-accent text-xl font-extrabold text-accent-foreground">
          {u.firstName[0]}
          {u.lastName[0]}
        </div>
        <div>
          <h1 className="font-display text-xl leading-tight font-semibold">
            {u.lastName} {u.firstName}
          </h1>
          {u.middleName && <p className="text-muted-foreground">{u.middleName}</p>}
        </div>
      </div>

      <dl className="divide-y divide-border rounded-xl border bg-card px-4 py-1">
        {rows.map(([k, v], i) => (
          <div key={k} className="enter py-3" style={stagger(i + 1)}>
            <dt className="text-[13px] text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <form action={logout}>
        <Button type="submit" variant="secondary" size="lg">
          <LogOut aria-hidden="true" />
          Выйти
        </Button>
      </form>
    </div>
  );
}
