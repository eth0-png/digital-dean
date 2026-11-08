"use client";

import { useState } from "react";
import { Coffee } from "lucide-react";
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
      <section key={day.date} className="mt-4 animate-in duration-200 fade-in lg:hidden" aria-label={`${day.full}, ${day.label}`}>
        <h2 className="mb-2.5 font-display text-[15px] font-semibold">
          {day.full}, {day.label}
          {day.today && <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 text-[12px] text-accent-foreground">сегодня</span>}
        </h2>
        <DayLessons day={day} />
      </section>

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
