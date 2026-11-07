import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { EmptyState, PageTransition } from "@/components/kit";

export const metadata: Metadata = { title: "Уведомления" };

export default function Page() {
  return (
    <PageTransition>
    <div className="space-y-4">
      <h1 className="font-display text-[22px] font-semibold">Уведомления</h1>
      <EmptyState icon={<Bell size={24} aria-hidden="true" />} title="Раздел скоро появится" text="Объявления деканата, изменения в расписании и напоминания о сроках." />
    </div>
    </PageTransition>
  );
}
