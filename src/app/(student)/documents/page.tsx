import type { Metadata } from "next";
import { FileText, Phone } from "lucide-react";
import { listMyApplications } from "@/lib/applications";
import { DEAN_OFFICE } from "@/lib/documents";
import { EmptyState, PageTransition, Reveal, SectionTitle } from "@/components/kit";
import { ApplicationList, ApplicationTracker, OrderTiles } from "@/components/documents/documents-ui";

export const metadata: Metadata = { title: "Документы" };

export default function DocumentsPage() {
  return (
    <PageTransition>
      <Reveal>
        <Documents />
      </Reveal>
    </PageTransition>
  );
}

async function Documents() {
  const apps = await listMyApplications();
  // Наверху самая важная заявка: где ждут ответа, иначе последняя в работе
  const active = apps.find((a) => a.status === "need_info") ?? apps.find((a) => a.status === "submitted" || a.status === "in_progress");
  const rest = apps.filter((a) => a !== active);

  return (
    <div className="space-y-5">
      <h1 className="enter font-display text-[22px] font-semibold">Документы</h1>
      {active && <ApplicationTracker app={active} href={`/documents/${active.id}`} />}
      <section>
        <SectionTitle>Заказать</SectionTitle>
        <OrderTiles hrefFor={(t) => `/documents/new?type=${t}`} />
      </section>
      <section>
        <SectionTitle>Мои заявки</SectionTitle>
        {rest.length > 0 ? (
          <ApplicationList apps={rest} hrefFor={(a) => `/documents/${a.id}`} />
        ) : active ? (
          <p className="text-sm text-muted-foreground">Других заявок нет.</p>
        ) : (
          <EmptyState
            icon={<FileText size={24} aria-hidden="true" />}
            title="Заявок пока нет"
            text="Закажите справку, и здесь будет видно, на каком она этапе."
          />
        )}
      </section>
      <a href={`tel:${DEAN_OFFICE.phone.replace(/[^+\d]/g, "")}`} className="press flex min-h-11 items-center gap-2 text-[13px] text-muted-foreground">
        <Phone size={16} aria-hidden="true" />
        Деканат: {DEAN_OFFICE.room.toLowerCase()}, {DEAN_OFFICE.phone}, {DEAN_OFFICE.hours}
      </a>
    </div>
  );
}
