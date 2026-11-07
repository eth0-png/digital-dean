import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { EmptyState, PageSkeleton, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Сегодня" };

export default function TodayPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Today />
    </Suspense>
  );
}

const dateFmt = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Moscow" });

// Каркас дня 2. Наполнение (ближайшая пара, «требует внимания», пары дня) в день 6.
async function Today() {
  const user = await requireStudent();
  const today = dateFmt.format(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[22px] leading-tight font-semibold">Привет, {user.firstName}!</h1>
        <p className="mt-1.5 text-muted first-letter:uppercase">{today}</p>
      </div>

      {/* Ближайшая пара: первым её хотят видеть 13 из 23 студентов */}
      <section className="rounded-hero bg-linear-to-br from-brand to-brand-2 p-[18px] text-white shadow-[0_16px_32px_-14px_rgba(91,61,245,.6)]">
        <span className="rounded-full bg-black/20 px-3 py-1 text-[13px] font-bold">Ближайшая пара</span>
        <div className="mt-4 flex items-center gap-3">
          <CalendarDays size={28} aria-hidden="true" />
          <p className="text-[17px] font-bold">Расписание скоро появится здесь</p>
        </div>
        <p className="mt-2 text-sm text-white/90">Время, аудитория, преподаватель и заметка о переносе, если пару сдвинули.</p>
      </section>

      <section>
        <SectionTitle>Требует внимания</SectionTitle>
        <EmptyState
          icon={<Sparkles size={24} aria-hidden="true" />}
          title="Пока всё спокойно"
          text="Здесь появятся готовые справки, новые оценки и ближайшие сроки."
        />
      </section>
    </div>
  );
}
