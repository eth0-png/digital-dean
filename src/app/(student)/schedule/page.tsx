import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Расписание" };

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-[22px] font-semibold">Расписание</h1>
      <EmptyState icon={<CalendarDays size={24} aria-hidden="true" />} title="Раздел скоро появится" text="Пары на день и неделю, аудитории, преподаватели и переносы." />
    </div>
  );
}
