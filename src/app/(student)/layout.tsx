import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Bell, X } from "lucide-react";
import { Logo, CONCEPT_NOTE } from "@/components/logo";
import { BottomNav, SideNav } from "@/components/bottom-nav";
import { HeaderToggle } from "@/components/header-toggle";
import { NavTrail } from "@/components/nav-trail";
import { requireStudent } from "@/lib/auth";
import { countMyUnread } from "@/lib/notifications";

const round = "press grid size-11 place-items-center rounded-full";
const bell = `${round} relative bg-secondary`;

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:mx-auto lg:flex lg:max-w-[1360px]">
      {/* На широком экране меню слева, на телефоне внизу */}
      <Suspense fallback={null}>
        <SideNav />
      </Suspense>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col lg:max-w-5xl lg:px-6">
        <header style={{ viewTransitionName: "app-header" }} className="sticky top-0 z-10 flex items-center gap-2 bg-background px-4 py-3 lg:justify-end">
          <Link href="/" transitionTypes={["nav-tab"]} className="flex min-h-11 flex-1 items-center gap-2.5 lg:hidden" aria-label="На главную">
            <Logo />
            <span className="font-display text-base font-semibold">деканат</span>
          </Link>
          {/* Переключатели читают адрес страницы, поэтому внутри Suspense */}
          <Suspense
            fallback={
              <Link href="/notifications" aria-label="Уведомления" className={bell}>
                <Bell size={22} aria-hidden="true" />
              </Link>
            }
          >
            <NotificationsBell />
          </Suspense>
          <Suspense fallback={<div className="size-11 animate-pulse rounded-full bg-secondary" />}>
            <Avatar />
          </Suspense>
        </header>
        <main className="flex-1 px-4 pt-2 pb-6">{children}</main>
        <footer className="px-4 pb-28 text-center text-xs text-muted-foreground lg:pb-8">{CONCEPT_NOTE}</footer>
        {/* Путь по кабинету для «назад» и закрытия профиля и уведомлений */}
        <Suspense fallback={null}>
          <NavTrail />
        </Suspense>
        {/* Меню читает адрес страницы, а на динамических путях он известен только при запросе */}
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </div>
    </div>
  );
}

/** Колокольчик со счётчиком непрочитанных. Счётчик обновляется, когда уведомления или заявку прочитали (refresh() в действии). */
async function NotificationsBell() {
  const unread = await countMyUnread();
  return (
    <HeaderToggle
      href="/notifications"
      label={unread ? `Уведомления, новых: ${unread}` : "Уведомления"}
      closeLabel="Закрыть уведомления"
      className={bell}
      openChildren={<X size={22} aria-hidden="true" />}
    >
      <Bell size={22} aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-extrabold text-primary-foreground ring-2 ring-background">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </HeaderToggle>
  );
}

async function Avatar() {
  const user = await requireStudent();
  return (
    <HeaderToggle href="/profile" label="Профиль" closeLabel="Закрыть профиль" className={`${round} bg-accent text-sm font-extrabold text-accent-foreground`}>
      {user.firstName[0]}
      {user.lastName[0]}
    </HeaderToggle>
  );
}
