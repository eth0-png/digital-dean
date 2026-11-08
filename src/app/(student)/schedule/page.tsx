import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { addDays, getWeek } from "@/lib/schedule";
import { PageTransition, Reveal, stagger } from "@/components/kit";
import { WeekPicker, WeekView } from "@/components/schedule";

export const metadata: Metadata = { title: "Расписание" };

export default function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  return (
    <PageTransition>
      <Reveal>
        <Schedule searchParams={searchParams} />
      </Reveal>
    </PageTransition>
  );
}

const arrow = "press grid size-11 shrink-0 place-items-center rounded-full bg-secondary";

async function Schedule({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const w = await getWeek((await searchParams).date);

  return (
    <div className="space-y-4">
      {/* На другой неделе рядом с заголовком «Сегодня»: возвращает к текущей неделе и сегодняшнему дню */}
      <div className="flex min-h-11 items-center justify-between gap-3 lg:max-w-md">
        <h1 className="enter font-display text-[22px] font-semibold">Расписание</h1>
        {!w.isCurrent && (
          <Link
            href="/schedule"
            transitionTypes={["nav-tab"]}
            scroll={false}
            className="press enter inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[14px] font-bold text-primary"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Сегодня
          </Link>
        )}
      </div>
      {/* Неделя: стрелки по сторонам, посередине даты и «эта неделя», по нажатию на даты календарь */}
      <div className="enter flex items-center gap-2 lg:max-w-md" style={stagger(1)}>
        <Link href={`/schedule?date=${w.prev}`} transitionTypes={["nav-tab"]} scroll={false} aria-label="Предыдущая неделя" className={arrow}>
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <WeekPicker key={w.monday} range={w.range} relation={w.relation} monday={w.monday} />
        <Link href={`/schedule?date=${w.next}`} transitionTypes={["nav-tab"]} scroll={false} aria-label="Следующая неделя" className={arrow}>
          <ChevronRight size={22} aria-hidden="true" />
        </Link>
      </div>
      {/* Изменения отмечены на самих парах и точкой на дне, отдельной плашки нет */}
      {/* Ключ с выбранным днём: дата из календаря в той же неделе тоже переключает день */}
      <WeekView key={`${w.monday}-${w.selected}`} days={w.days} selected={w.selected} prev={addDays(w.monday, -2)} next={w.next} />
    </div>
  );
}
