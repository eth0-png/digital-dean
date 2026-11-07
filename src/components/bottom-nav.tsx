"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, FileText, GraduationCap, House } from "lucide-react";
import { Logo } from "@/components/logo";

// Порядок вкладок по опросу: расписание 19 из 22, оценки 15 из 22, справки 12 из 22.
const TABS = [
  { href: "/", label: "Сегодня", Icon: House },
  { href: "/schedule", label: "Расписание", Icon: CalendarDays },
  { href: "/study", label: "Учёба", Icon: GraduationCap },
  { href: "/documents", label: "Документы", Icon: FileText },
];

const activeTab = (path: string) => TABS.findIndex(({ href }) => (href === "/" ? path === "/" : path.startsWith(href)));

/** Нижнее меню на телефоне. На широком экране вместо него меню слева (SideNav). */
export function BottomNav() {
  const path = usePathname();
  const active = activeTab(path);

  // В профиле и уведомлениях выбранной вкладки нет: подсветка гаснет на месте, а не уезжает влево.
  // Когда возвращаемся, она появляется сразу у нужной вкладки, без проезда через всё меню.
  const [pill, setPill] = useState({ active, pos: Math.max(active, 0), jump: false });
  if (pill.active !== active) {
    setPill({ active, pos: active >= 0 ? active : pill.pos, jump: pill.active < 0 });
  }

  // Внутри задачи (оформление, заявка) меню прячется: внизу своя главная кнопка
  if (/^\/documents\/.+/.test(path)) return null;

  return (
    <nav
      aria-label="Разделы"
      style={{ viewTransitionName: "app-nav" }}
      className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 mx-auto max-w-[420px] rounded-3xl bg-nav p-2 lg:hidden"
    >
      <div className="relative grid grid-cols-4">
        {/* Подсветка скользит между вкладками, а к профилю и уведомлениям просто гаснет */}
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1/4 rounded-2xl bg-primary duration-[260ms] ease-[cubic-bezier(.2,.8,.2,1)] ${
            pill.jump ? "transition-opacity" : "transition-[transform,opacity]"
          }`}
          style={{ transform: `translateX(${pill.pos * 100}%)`, opacity: active < 0 ? 0 : 1 }}
        />
        {TABS.map(({ href, label, Icon }, i) => (
          <Link
            key={href}
            href={href}
            transitionTypes={["nav-tab"]}
            aria-current={i === active ? "page" : undefined}
            className={`press relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition-colors duration-300 ${
              i === active ? "text-primary-foreground" : "text-nav-foreground"
            }`}
          >
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/**
 * Меню слева на широком экране (от 1024 px): те же разделы, что внизу на телефоне.
 * Остаётся на месте при переходах, как шапка. Внутри заявки не прячется: на компьютере места хватает.
 */
export function SideNav() {
  const path = usePathname();
  const active = activeTab(path);
  return (
    <aside style={{ viewTransitionName: "app-side" }} className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-background px-3 py-4 lg:flex">
      <Link href="/" transitionTypes={["nav-tab"]} className="flex min-h-11 items-center gap-2.5 px-2" aria-label="На главную">
        <Logo />
        <span className="font-display text-base font-semibold">деканат</span>
      </Link>
      <nav aria-label="Разделы" className="mt-8 grid gap-1">
        {TABS.map(({ href, label, Icon }, i) => (
          <Link
            key={href}
            href={href}
            transitionTypes={["nav-tab"]}
            aria-current={i === active ? "page" : undefined}
            className={`press flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-bold transition-colors duration-200 ${
              i === active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
