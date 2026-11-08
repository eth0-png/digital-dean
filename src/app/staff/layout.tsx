import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Logo, CONCEPT_NOTE } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { NavTrail } from "@/components/nav-trail";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col lg:max-w-5xl lg:px-6">
      <a href="#main" className="sr-only z-50 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Перейти к содержимому
      </a>
      <header style={{ viewTransitionName: "app-header" }} className="sticky top-0 z-10 flex items-center gap-2.5 bg-background px-4 py-3">
        <Link href="/staff" transitionTypes={["nav-back"]} className="flex min-h-11 flex-1 items-center gap-2.5" aria-label="К очереди заявок">
          <Logo />
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold">деканат</span>
            <span className="block text-xs text-muted-foreground">кабинет сотрудника</span>
          </span>
        </Link>
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
