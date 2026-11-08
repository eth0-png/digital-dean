"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Coffee } from "lucide-react";
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
 * Сегодня прошедшие пары бледнее, идущая выделена.
 */
export function LessonCard({ lesson: l, i = 0 }: { lesson: Lesson; i?: number }) {
  const cancelled = l.change?.kind === "cancelled";
  const c = l.change ? CHANGE[l.change.kind] : null;
  return (
    <li
      className={`enter flex gap-3 rounded-xl border px-3.5 py-3 ${l.state === "now" ? "border-primary/40 bg-accent/60" : l.state === "past" || cancelled ? "border-transparent bg-muted" : "bg-card"}`}
      style={stagger(i)}
    >
      <div className="w-12 shrink-0 text-right tabular-nums">
        <p className={`font-bold ${cancelled ? "line-through" : ""}`}>{l.start}</p>
        <p className="text-[13px] text-muted-foreground">{l.end}</p>
      </div>
      <div className="min-w-0 flex-1 border-l pl-3">
        <p className={`leading-snug font-bold ${cancelled ? "line-through" : ""}`}>{l.subject}</p>
        <p className="text-[13px] text-muted-foreground">
          {l.kind}, {l.place}
        </p>
        <p className="text-[13px] text-muted-foreground">{l.teacher}</p>
        {(c || l.state === "now") && (
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {l.state === "now" && <span className="rounded-md bg-primary px-2 py-0.5 text-[12px] font-bold text-primary-foreground">Идёт сейчас</span>}
            {c && <span className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${c.tone}`}>{c.text(l)}</span>}
          </p>
        )}
        {l.change?.note && <p className="mt-1 text-[13px] text-muted-foreground">{l.change.note}</p>}
      </div>
    </li>
  );
}

export function DayLessons({ day }: { day: Day }) {
  if (day.lessons.length === 0) {
    return (
      <p className="enter flex items-center gap-2.5 rounded-xl bg-secondary px-3.5 py-3 text-sm text-muted-foreground">
        <Coffee size={18} aria-hidden="true" />
        Пар нет
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
export function WeekView({ days, selected }: { days: Day[]; selected: number }) {
  const [sel, setSel] = useState(selected);
  const day = days[sel];
  // Свайп по парам листает дни внутри недели: влево следующий, вправо предыдущий
  const area = useRef<HTMLDivElement>(null);
  useSwipe(area, (dir) => setSel((i) => Math.min(Math.max(i + dir, 0), days.length - 1)));
  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 lg:hidden">
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            onClick={() => setSel(i)}
            aria-pressed={i === sel}
            aria-label={`${d.full}, ${d.label}${d.today ? ", сегодня" : ""}`}
            className={`press relative flex min-h-14 flex-col items-center justify-center rounded-xl text-[12.5px] font-bold transition-colors duration-200 ${
              i === sel ? "bg-primary text-primary-foreground" : d.today ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {d.short}
            <span className="text-base">{Number(d.date.slice(8))}</span>
            {d.lessons.some((l) => l.change) && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-warning" />}
          </button>
        ))}
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
