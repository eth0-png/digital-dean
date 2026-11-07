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
  const path = usePathname();
  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 mx-auto grid max-w-[420px] grid-cols-4 gap-1 rounded-3xl bg-ink p-2 shadow-[0_12px_30px_-10px_rgba(23,17,46,.5)]"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition ${
              active ? "bg-linear-to-br from-brand to-brand-2 text-white" : "text-[#B9B3D3]"
            }`}
          >
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
