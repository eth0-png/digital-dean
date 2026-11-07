"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, CalendarX, CircleCheck, CircleX, Hourglass, MapPin, MessageCircle, MessageCircleQuestion, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionTitle, stagger } from "@/components/kit";
import type { Notice } from "@/lib/notifications";
import { markAllNoticesRead } from "@/app/(student)/notifications/actions";

const ICON: Partial<Record<Notice["kind"], { icon: LucideIcon; tone: string }>> = {
  in_progress: { icon: Hourglass, tone: "bg-accent text-primary" },
  question: { icon: MessageCircleQuestion, tone: "bg-warning-soft text-warning" },
  reply: { icon: MessageCircle, tone: "bg-accent text-primary" },
  ready: { icon: CircleCheck, tone: "bg-success-soft text-success" },
  rejected: { icon: CircleX, tone: "bg-destructive-soft text-destructive" },
  moved: { icon: CalendarClock, tone: "bg-warning-soft text-warning" },
  room: { icon: MapPin, tone: "bg-warning-soft text-warning" },
  cancelled: { icon: CalendarX, tone: "bg-destructive-soft text-destructive" },
};

/**
 * Лента уведомлений. Открыли раздел: всё отмечается прочитанным, счётчик в шапке гаснет.
 * Что было новым при открытии, остаётся выделенным до ухода со страницы: список новых запоминается
 * при первом показе и не меняется, когда сервер уже вернул всё прочитанным.
 */
export function NoticeList({ notices }: { notices: Notice[] }) {
  const [fresh] = useState(() => new Set(notices.filter((n) => n.unread).map((n) => n.id)));

  useEffect(() => {
    if (fresh.size > 0) markAllNoticesRead();
  }, [fresh]);

  const news = notices.filter((n) => fresh.has(n.id));
  const earlier = notices.filter((n) => !fresh.has(n.id));
  const list = (items: Notice[], from: number) => (
    <ul className="space-y-2">
      {items.map((n, i) => (
        <Item key={n.id} notice={n} fresh={fresh.has(n.id)} i={from + i} />
      ))}
    </ul>
  );

  return (
    <div className="space-y-5">
      {news.length > 0 && (
        <section>
          <SectionTitle>Новые</SectionTitle>
          {list(news, 0)}
        </section>
      )}
      {earlier.length > 0 && (
        <section>
          {news.length > 0 && <SectionTitle>Ранее</SectionTitle>}
          {list(earlier, news.length)}
        </section>
      )}
    </div>
  );
}

function Item({ notice: n, fresh, i }: { notice: Notice; fresh: boolean; i: number }) {
  const { icon: Icon, tone } = ICON[n.kind] ?? ICON.reply!;
  return (
    <li className="enter" style={stagger(i + 1)}>
      <Link
        href={n.href}
        transitionTypes={["nav-forward"]}
        className={`press flex gap-3 rounded-xl border px-3.5 py-3 ${fresh ? "border-primary/25 bg-accent/60" : "bg-card"}`}
      >
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-bold">{n.title}</span>
            {fresh && (
              <>
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span className="sr-only">, новое</span>
              </>
            )}
          </span>
          <span className="block text-[13px] text-muted-foreground">{n.about}</span>
          {n.text && <span className="mt-1 line-clamp-2 block text-[14px] leading-snug">{n.text}</span>}
          <span className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[12.5px] text-muted-foreground">{n.at}</span>
            {n.needAnswer && <Badge variant="warning">Нужен ответ</Badge>}
          </span>
        </span>
      </Link>
    </li>
  );
}
