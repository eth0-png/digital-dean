import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getWeek } from "@/lib/schedule";
import { PageTransition, Reveal, stagger } from "@/components/kit";
import { WeekView } from "@/components/schedule";

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
  const hasChanges = w.days.some((d) => d.lessons.some((l) => l.change));

  return (
    <div className="space-y-4">
      <h1 className="enter font-display text-[22px] font-semibold">Расписание</h1>
      {/* Неделя: стрелки по сторонам, посередине даты и «эта неделя» */}
      <div className="enter flex items-center gap-2 lg:max-w-md" style={stagger(1)}>
        <Link href={`/schedule?date=${w.prev}`} transitionTypes={["nav-tab"]} scroll={false} aria-label="Предыдущая неделя" className={arrow}>
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        {w.isCurrent ? (
          <p className="flex-1 text-center leading-tight">
            <span className="block font-bold">{w.range}</span>
            <span className="text-[13px] text-muted-foreground">{w.relation}</span>
          </p>
        ) : (
          // Другая неделя: вся середина ведёт обратно к текущей
          <Link href="/schedule" transitionTypes={["nav-tab"]} scroll={false} className="press flex min-h-11 flex-1 flex-col items-center justify-center rounded-xl leading-tight">
            <span className="font-bold">{w.range}</span>
            <span className="text-[13px] font-bold text-primary">{w.relation ? `${w.relation}, ` : ""}к текущей</span>
          </Link>
        )}
        <Link href={`/schedule?date=${w.next}`} transitionTypes={["nav-tab"]} scroll={false} aria-label="Следующая неделя" className={arrow}>
          <ChevronRight size={22} aria-hidden="true" />
        </Link>
      </div>
      {hasChanges && (
        <p className="enter rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm font-semibold text-warning" style={stagger(2)}>
          На этой неделе есть изменения, они отмечены на парах
        </p>
      )}
      <WeekView key={w.monday} days={w.days} selected={w.selected} />
    </div>
  );
}
