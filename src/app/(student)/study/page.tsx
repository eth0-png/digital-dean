import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { EmptyState, PageTransition } from "@/components/kit";

export const metadata: Metadata = { title: "Учёба" };

export default function Page() {
  return (
    <PageTransition>
    <div className="space-y-4">
      <h1 className="font-display text-[22px] font-semibold">Учёба</h1>
      <EmptyState icon={<GraduationCap size={24} aria-hidden="true" />} title="Раздел скоро появится" text="Оценки и зачёты по дисциплинам, сессия и сводка «как у меня дела»." />
    </div>
    </PageTransition>
  );
}
