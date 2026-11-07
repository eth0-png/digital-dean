"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FileText, GraduationCap, House } from "lucide-react";

// Порядок вкладок по опросу: расписание 19 из 22, оценки 15 из 22, справки 12 из 22.
const TABS = [
  { href: "/", label: "Сегодня", Icon: House },
  { href: "/schedule", label: "Расписание", Icon: CalendarDays },
  { href: "/study", label: "Учёба", Icon: GraduationCap },
  { href: "/documents", label: "Документы", Icon: FileText },
];

export function BottomNav() {
  // /design/... это превью макетов, ведёт себя как настоящий путь без приставки
  const path = usePathname().replace(/^\/design(?=\/)/, "");
  const active = TABS.findIndex(({ href }) => (href === "/" ? path === "/" : path.startsWith(href)));
  // Внутри задачи (оформление, заявка) меню прячется: внизу своя главная кнопка
  if (/^\/documents\/.+/.test(path)) return null;

  return (
    <nav
      aria-label="Разделы"
      style={{ viewTransitionName: "app-nav" }}
      className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 mx-auto max-w-[420px] rounded-3xl bg-nav p-2 shadow-[0_12px_30px_-10px_rgba(14,26,51,.5)]"
    >
      <div className="relative grid grid-cols-4">
        {/* Подсветка скользит к выбранной вкладке */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1/4 rounded-2xl bg-primary transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ transform: `translateX(${Math.max(active, 0) * 100}%)`, opacity: active < 0 ? 0 : 1 }}
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
