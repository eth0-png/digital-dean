import type { Metadata } from "next";
import { FileText, Phone } from "lucide-react";
import { listMyApplications } from "@/lib/applications";
import { DEAN_OFFICE } from "@/lib/documents";
import { EmptyState, PageTransition, Reveal, SectionTitle } from "@/components/kit";
import { ApplicationList, ApplicationTracker, OrderTiles } from "@/components/documents/documents-ui";
import { SwipeCarousel } from "@/components/swipe-carousel";

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
  // Наверху заявки в процессе каруселью: первыми те, где деканат ждёт ответа, дальше новые сверху
  const active = [...apps.filter((a) => a.status === "need_info"), ...apps.filter((a) => a.status === "submitted" || a.status === "in_progress")];
  const rest = apps.filter((a) => !active.includes(a));

  return (
    <div className="space-y-5">
      <h1 className="enter font-display text-[22px] font-semibold">Документы</h1>
      {active.length > 0 && (
        <SwipeCarousel label="Заявки в процессе">
          {active.map((a) => (
            <ApplicationTracker key={a.id} app={a} href={`/documents/${a.id}`} />
          ))}
        </SwipeCarousel>
      )}
      <section>
        <SectionTitle>Заказать</SectionTitle>
        <OrderTiles hrefFor={(t) => `/documents/new?type=${t}`} />
      </section>
      <section>
        <SectionTitle>{active.length > 0 ? "Завершённые" : "Мои заявки"}</SectionTitle>
        {rest.length > 0 ? (
          <ApplicationList apps={rest} hrefFor={(a) => `/documents/${a.id}`} />
        ) : active.length > 0 ? (
          <p className="text-sm text-muted-foreground">Пока ни одна заявка не завершена.</p>
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
