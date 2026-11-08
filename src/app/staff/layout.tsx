import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Logo, CONCEPT_NOTE } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { NavTrail } from "@/components/nav-trail";
import { requireStaff } from "@/lib/auth";
import { UserAvatar } from "@/components/avatar";
import { AvatarPicker } from "@/components/avatar-picker";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col lg:max-w-5xl lg:px-6">
      <a href="#main" className="sr-only z-50 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Перейти к содержимому
      </a>
      <header style={{ viewTransitionName: "app-header" }} className="sticky top-0 z-30 flex items-center gap-2.5 bg-background px-4 py-3">
        <Link href="/staff" transitionTypes={["nav-back"]} className="flex min-h-11 flex-1 items-center gap-2.5" aria-label="К очереди заявок">
          <Logo />
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold">деканат</span>
            <span className="block text-xs text-muted-foreground">кабинет сотрудника</span>
          </span>
        </Link>
        <Suspense fallback={<span className="size-11 animate-pulse rounded-full bg-secondary" />}>
          <StaffAvatar />
        </Suspense>
        <form action={logout}>
          <Button type="submit" variant="secondary" className="rounded-full">
            <LogOut aria-hidden="true" />
            Выйти
          </Button>
        </form>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 px-4 pt-2 pb-6 outline-none">
        {children}
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">{CONCEPT_NOTE}</footer>
      <Suspense fallback={null}>
        <NavTrail />
      </Suspense>
    </div>
  );
}

/** Аватарка сотрудника: её видят студенты в переписке. Нажатие открывает выбор. */
async function StaffAvatar() {
  const user = await requireStaff();
  const initials = `${user.firstName[0]}${user.lastName[0]}`;
  return (
    <AvatarPicker
      current={user.avatar}
      initials={initials}
      trigger={
        <button type="button" aria-label="Сменить аватарку" className="press shrink-0 rounded-full">
          <UserAvatar avatar={user.avatar} initials={initials} size="size-11 text-sm" />
        </button>
      }
    />
  );
}
