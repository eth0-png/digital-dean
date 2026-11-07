import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { Logo, CONCEPT_NOTE } from "@/components/logo";
import { BottomNav } from "@/components/bottom-nav";
import { requireStudent } from "@/lib/auth";

const round = "press grid size-11 place-items-center rounded-full";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header
        style={{ viewTransitionName: "app-header" }}
        className="sticky top-0 z-10 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur"
      >
        <Link href="/" transitionTypes={["nav-tab"]} className="flex min-h-11 flex-1 items-center gap-2.5" aria-label="На главную">
          <Logo />
          <span className="font-display text-base font-semibold">деканат</span>
        </Link>
        <Link href="/notifications" transitionTypes={["nav-forward"]} aria-label="Уведомления" className={`${round} bg-secondary`}>
          <Bell size={22} aria-hidden="true" />
        </Link>
        <Suspense fallback={<div className="size-11 animate-pulse rounded-full bg-secondary" />}>
          <AvatarLink />
        </Suspense>
      </header>
      <main className="flex-1 px-4 pt-2 pb-6">{children}</main>
      <footer className="px-4 pb-28 text-center text-xs text-muted-foreground">{CONCEPT_NOTE}</footer>
      {/* Меню читает адрес страницы, а на динамических путях он известен только при запросе */}
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}

async function AvatarLink() {
  const user = await requireStudent();
  return (
    <Link
      href="/profile"
      transitionTypes={["nav-forward"]}
      aria-label="Профиль"
      className={`${round} bg-accent text-sm font-extrabold text-accent-foreground`}
    >
      {user.firstName[0]}
      {user.lastName[0]}
    </Link>
  );
}
