"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, CalendarPlus, ChevronDown, ChevronRight, Clock, Coffee, Mail, MapPin, MessageSquareText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useWide } from "@/components/documents/chat";
import { useSwipe } from "@/components/documents/documents-client";
import { stagger } from "@/components/kit";
import type { Day, Lesson } from "@/lib/schedule";

const CHANGE = {
  moved: { text: (l: Lesson) => `Перенос, была в ${l.change?.from}`, tone: "bg-warning-soft text-warning" },
  room: { text: (l: Lesson) => `Другая аудитория, была ${l.change?.from}`, tone: "bg-warning-soft text-warning" },
  cancelled: { text: () => "Отменена", tone: "bg-destructive-soft text-destructive" },
};

/**
 * Пара: время слева, предмет и где справа. Изменение (перенос, аудитория, отмена) меткой прямо на карточке.
 * Сегодня прошедшие пары бледнее, идущая выделена. Нажатие открывает карточку пары (шторка, на компьютере панель справа).
 */
export function LessonCard({ lesson: l, i = 0 }: { lesson: Lesson; i?: number }) {
  const [open, setOpen] = useState(false);
  const cancelled = l.change?.kind === "cancelled";
  const c = l.change ? CHANGE[l.change.kind] : null;
  return (
    <li className="enter" style={stagger(i)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`press flex w-full gap-3 rounded-xl border px-3.5 py-3 text-left hover:border-primary/40 ${
          l.state === "now" ? "border-primary/40 bg-accent/60" : l.state === "past" || cancelled ? "border-transparent bg-muted" : "bg-card"
        }`}
      >
        <span className="w-12 shrink-0 text-right tabular-nums">
          <span className={`block font-bold ${cancelled ? "line-through" : ""}`}>{l.start}</span>
          <span className="block text-[13px] text-muted-foreground">{l.end}</span>
        </span>
        <span className="min-w-0 flex-1 border-l pl-3">
          <span className={`block leading-snug font-bold ${cancelled ? "line-through" : ""}`}>{l.subject}</span>
          <span className="block text-[13px] text-muted-foreground">
            {l.kind}, {l.place}
          </span>
          <span className="block text-[13px] text-muted-foreground">{l.teacher}</span>
          {(c || l.state === "now") && (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {l.state === "now" && <span className="rounded-md bg-primary px-2 py-0.5 text-[12px] font-bold text-primary-foreground">Идёт сейчас</span>}
              {c && <span className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${c.tone}`}>{c.text(l)}</span>}
            </span>
          )}
          {l.change?.note && <span className="mt-1 block text-[13px] text-muted-foreground">{l.change.note}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-center justify-between self-stretch text-muted-foreground">
          {l.comment ? <MessageSquareText size={16} className="text-primary" role="img" aria-label="Есть комментарий преподавателя" /> : <span />}
          <ChevronRight size={18} aria-hidden="true" />
          <span />
        </span>
      </button>
      <LessonSheet lesson={l} open={open} onOpenChange={setOpen} />
    </li>
  );
}

/** Строка карточки пары: значок слева, подпись и значение. */
function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <div className="font-semibold">{children}</div>
      </div>
    </div>
  );
}

/**
 * Карточка пары: когда и где (с этажом), изменение с причиной, комментарий преподавателя, преподаватель с кафедрой и почтой,
 * когда следующая такая же пара, «Добавить в календарь». Шторка снизу на телефоне, панель справа на компьютере, как переписка.
 */
function LessonSheet({ lesson: l, open, onOpenChange }: { lesson: Lesson; open: boolean; onOpenChange: (v: boolean) => void }) {
  const wide = useWide();
  const cancelled = l.change?.kind === "cancelled";
  const c = l.change ? CHANGE[l.change.kind] : null;
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={wide ? "right" : "bottom"}>
      <DrawerContent
        className={
          wide
            ? "h-dvh rounded-l-[28px] data-[vaul-drawer-direction=right]:w-[420px] data-[vaul-drawer-direction=right]:sm:max-w-[420px]"
            : "mx-auto max-h-[92dvh] max-w-md rounded-t-[28px] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh]"
        }
      >
        <DrawerHeader className="flex-row items-center gap-2 border-b px-2 pt-2 pb-2.5 text-left">
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label="Закрыть карточку пары">
              {wide ? <X aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            </Button>
          </DrawerClose>
          <span className="min-w-0 flex-1 pl-1 text-left">
            <DrawerTitle className={`text-base leading-snug font-bold ${cancelled ? "line-through" : ""}`}>{l.subject}</DrawerTitle>
            <DrawerDescription className="text-[13px] first-letter:uppercase">{l.kind}</DrawerDescription>
          </span>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
          {c && (
            <p className={`rounded-xl px-3.5 py-3 text-sm font-semibold ${c.tone}`}>
              {c.text(l)}
              {l.change?.note && <span className="mt-0.5 block font-normal">{l.change.note}</span>}
            </p>
          )}
          <Row icon={Clock} label="Когда">
            {l.day}, {l.start}–{l.end}
          </Row>
          <Row icon={MapPin} label="Где">
            {l.place}
            {l.floor ? `, ${l.floor} этаж` : ""}
          </Row>
          {l.comment && (
            <Row icon={MessageSquareText} label="Комментарий преподавателя">
              <span className="font-normal">{l.comment}</span>
            </Row>
          )}
          {l.info && (
            <div className="rounded-xl border px-3.5 py-3">
              <p className="text-[13px] text-muted-foreground">Преподаватель</p>
              <p className="mt-0.5 font-bold">{l.info.full}</p>
              <p className="text-[13px] text-muted-foreground">{l.info.dept}</p>
              <a href={`mailto:${l.info.email}`} className="press mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary">
                <Mail size={17} aria-hidden="true" />
                {l.info.email}
              </a>
            </div>
          )}
          {l.next && (
            <Row icon={CalendarClock} label="Следующая такая пара">
              {l.next}
            </Row>
          )}
          {!cancelled && (
            <Button variant="secondary" size="lg" className="w-full" onClick={() => downloadIcs(l)}>
              <CalendarPlus aria-hidden="true" />
              Добавить в календарь
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Пара файлом .ics: телефон открывает его в календаре (iPhone сразу предлагает добавить, Android через «Открыть»).
 * Время по Москве (UTC+3 без перехода на летнее), в файле в UTC. Собираем в браузере, на сервер ничего не уходит.
 */
function downloadIcs(l: Lesson) {
  const utc = (hhmm: string) => {
    const d = new Date(`${l.date}T${hhmm}:00+03:00`);
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const info = [l.info ? `${l.info.full}, ${l.info.dept}` : l.teacher, l.comment].filter(Boolean).join("\n");
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Digital Dean concept//RU",
    "BEGIN:VEVENT",
    `UID:${l.date}-${l.start.replace(":", "")}-${encodeURIComponent(l.subject).slice(0, 40)}@digital-dean`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${utc(l.start)}`,
    `DTEND:${utc(l.end)}`,
    `SUMMARY:${esc(`${l.subject} (${l.kind})`)}`,
    `LOCATION:${esc(l.floor ? `${l.place}, ${l.floor} этаж` : l.place)}`,
    `DESCRIPTION:${esc(info)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `para-${l.date}-${l.start.replace(":", "")}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DayLessons({ day }: { day: Day }) {
  if (day.lessons.length === 0) {
    return (
      <p className="enter flex items-center gap-2.5 rounded-xl bg-secondary px-3.5 py-3 text-sm text-muted-foreground">
        <Coffee size={18} aria-hidden="true" />
        {day.session ? "Сессия, в этот день нет экзаменов и зачётов" : "Пар нет"}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {day.lessons.map((l, i) => (
        <LessonCard key={`${l.slot}-${l.subject}`} lesson={l} i={i + 1} />
      ))}
    </ul>
  );
}

/**
 * Неделя. На телефоне дни кнопками и пары выбранного дня, переключение без перезагрузки.
 * На широком экране вся неделя сразу: по два дня в ряд, от 1280 px по три.
 */
export function WeekView({ days, selected, prev, next }: { days: Day[]; selected: number; prev: string; next: string }) {
  const router = useRouter();
  const [sel, setSel] = useState(selected);
  const day = days[sel];
  // Свайп листает дни: влево следующий, вправо предыдущий. После субботы следующая неделя с понедельника,
  // перед понедельником прошлая неделя с субботы
  const area = useRef<HTMLDivElement>(null);
  useSwipe(area, (dir) => {
    const i = sel + dir;
    if (i >= 0 && i < days.length) return setSel(i);
    router.push(`/schedule?date=${dir > 0 ? next : prev}`, { scroll: false });
  });
  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 lg:hidden">
        {days.map((d, i) => {
          // В сессию день с экзаменом или зачётом подписан: видно, в какой день идти, не открывая каждый
          const control = d.session && d.lessons.length > 0 ? (d.lessons.some((l) => l.kind.startsWith("экзамен")) ? "экзамен" : "зачёт") : null;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSel(i)}
              aria-pressed={i === sel}
              aria-label={`${d.full}, ${d.label}${d.today ? ", сегодня" : ""}${control ? `, ${control}` : ""}`}
              className={`press relative flex min-h-14 flex-col items-center justify-center rounded-xl text-[12.5px] font-bold transition-colors duration-200 ${
                i === sel ? "bg-primary text-primary-foreground" : d.today ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {d.short}
              <span className={`text-base ${control ? "leading-none" : ""}`}>{Number(d.date.slice(8))}</span>
              {control && <span className={`mt-0.5 text-[10.5px] leading-none ${i === sel ? "" : "text-primary"}`}>{control.slice(0, 3)}</span>}
              {d.lessons.some((l) => l.change) && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-warning" />}
            </button>
          );
        })}
      </div>
      <div ref={area} className="touch-pan-y lg:hidden">
        <section key={day.date} className="mt-4 animate-in duration-200 fade-in" aria-label={`${day.full}, ${day.label}`}>
          <h2 className="mb-2.5 font-display text-[15px] font-semibold">
            {day.full}, {day.label}
            {day.today && <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 text-[12px] text-accent-foreground">сегодня</span>}
          </h2>
          <DayLessons day={day} />
        </section>
      </div>

      <div className="hidden gap-x-6 gap-y-8 lg:grid lg:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => (
          <section key={d.date} aria-label={`${d.full}, ${d.label}`}>
            <h2 className={`mb-2.5 font-display text-[15px] font-semibold ${d.today ? "text-primary" : ""}`}>
              {d.full}, {d.label}
              {d.today && <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 text-[12px] text-accent-foreground">сегодня</span>}
            </h2>
            <DayLessons day={d} />
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * Даты недели посередине переключателя: нажатие открывает системный выбор даты (календарь телефона или браузера),
 * выбранный день открывает свою неделю. Поле даты скрыто, открываем его через showPicker, где он есть.
 */
export function WeekPicker({ range, relation, monday }: { range: string; relation: string; monday: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => {
          const el = input.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
          }
        }}
        aria-label={`Выбрать неделю в календаре, сейчас ${range}${relation ? `, ${relation}` : ""}`}
        className="press flex min-h-11 w-full flex-col items-center justify-center rounded-xl leading-tight"
      >
        <span className="inline-flex items-center gap-1.5 font-bold">
          <CalendarDays size={17} className="text-primary" aria-hidden="true" />
          {range}
        </span>
        {relation && <span className="text-[13px] text-muted-foreground">{relation}</span>}
      </button>
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        defaultValue={monday}
        onChange={(e) => e.target.value && router.push(`/schedule?date=${e.target.value}`, { scroll: false })}
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
      />
    </div>
  );
}
