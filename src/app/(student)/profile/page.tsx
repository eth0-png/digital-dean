import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, PencilLine } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { UserAvatar } from "@/components/avatar";
import { AvatarPicker } from "@/components/avatar-picker";
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
  // Поля как в кабинете МГИМО (research/lks-mgimo-review.md). Год поступления по курсу: учебный год с сентября
  const d = new Date();
  const admitted = (d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1) - (u.course ?? 1) + 1;
  const rows: [string, string][] = [
    ["Факультет", u.faculty ?? ""],
    ["Направление", u.program ?? ""],
    ["Уровень подготовки", "Бакалавриат"],
    ["Форма обучения", "Очная"],
    ["Курс и группа", `${u.course} курс, ${u.groupName ?? ""}`],
    ["Год поступления", `${admitted}`],
    ["Номер зачётной книжки", u.studentCard ?? ""],
    ["Статус", "Обучается"],
  ];

  return (
    <div className="space-y-5 lg:max-w-3xl">
      <div className="enter flex items-center gap-4">
        <AvatarPicker
          current={u.avatar}
          initials={`${u.firstName[0]}${u.lastName[0]}`}
          trigger={
            <button type="button" aria-label="Сменить аватарку" className="press relative shrink-0 rounded-full">
              <UserAvatar avatar={u.avatar} initials={`${u.firstName[0]}${u.lastName[0]}`} size="size-16 text-xl" icon={30} />
              <span className="absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full bg-background text-primary ring-2 ring-background">
                <PencilLine size={14} aria-hidden="true" />
              </span>
            </button>
          }
        />
        <div>
          <h1 className="font-display text-xl leading-tight font-semibold">
            {u.lastName} {u.firstName}
          </h1>
          {u.middleName && <p className="text-muted-foreground">{u.middleName}</p>}
        </div>
      </div>

      <dl className="divide-y divide-border rounded-xl border bg-card px-4 py-1 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:divide-y-0">
        {rows.map(([k, v], i) => (
          <div key={k} className="enter py-3 lg:border-b lg:[&:nth-last-child(-n+2)]:border-b-0" style={stagger(i + 1)}>
            <dt className="text-[13px] text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Ошибки в данных: 2 из 2 таких обращений в опросе не решились без визита. На компьютере кнопки в ряд */}
      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
      <Button asChild variant="outline" size="lg" className="border-2">
        <Link href="/documents/new?type=data_fix" transitionTypes={["nav-forward"]}>
          <PencilLine aria-hidden="true" />
          Нашли ошибку в данных
        </Link>
      </Button>

      <form action={logout}>
        <Button type="submit" variant="secondary" size="lg">
          <LogOut aria-hidden="true" />
          Выйти
        </Button>
      </form>
      </div>
    </div>
  );
}
