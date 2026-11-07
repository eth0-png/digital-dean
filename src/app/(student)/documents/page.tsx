import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { EmptyState, PageTransition } from "@/components/kit";

export const metadata: Metadata = { title: "Документы" };

export default function Page() {
  return (
    <PageTransition>
    <div className="space-y-4">
      <h1 className="font-display text-[22px] font-semibold">Документы</h1>
      <EmptyState icon={<FileText size={24} aria-hidden="true" />} title="Раздел скоро появится" text="Справки и заявления онлайн, статус заявки и готовые документы." />
    </div>
    </PageTransition>
  );
}
