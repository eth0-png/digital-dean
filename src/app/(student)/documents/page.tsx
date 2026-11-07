import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, Phone } from "lucide-react";
import { listMyApplications } from "@/lib/applications";
import { DEAN_OFFICE, plural } from "@/lib/documents";
import { EmptyState, PageTransition, Reveal, SectionTitle } from "@/components/kit";
import { ApplicationTracker, OrderTiles } from "@/components/documents/documents-ui";
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

// Главный экран «Документов»: заявки в процессе и заказ. Все заявки, включая готовые, в разделе «Мои заявки».
async function Documents() {
  const apps = await listMyApplications();
  // Каруселью только заявки в процессе: первыми те, где деканат ждёт ответа, дальше новые сверху
  const active = [...apps.filter((a) => a.status === "need_info"), ...apps.filter((a) => a.status === "submitted" || a.status === "in_progress")];
  const done = apps.length - active.length;

  return (
    <div className="space-y-5">
      <h1 className="enter font-display text-[22px] font-semibold">Документы</h1>

      {active.length > 0 ? (
        <section>
          <div className="mb-1 flex items-center justify-between">
            <SectionTitle>В процессе</SectionTitle>
            <Link href="/documents/all" transitionTypes={["nav-forward"]} className="-mt-2.5 -mr-1 inline-flex min-h-11 items-center gap-0.5 text-sm font-bold text-primary">
              Все заявки · {apps.length}
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <SwipeCarousel label="Заявки в процессе">
            {active.map((a) => (
              <ApplicationTracker key={a.id} app={a} href={`/documents/${a.id}`} />
            ))}
          </SwipeCarousel>
        </section>
      ) : (
        apps.length > 0 && (
          <Link href="/documents/all" transitionTypes={["nav-forward"]} className="press enter flex items-center gap-3 rounded-xl border px-3.5 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <FileText size={20} aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block font-bold">Мои заявки</span>
              <span className="block text-[13px] text-muted-foreground">
                {done} {plural(done, "завершённая", "завершённые", "завершённых")}, в работе ничего нет
              </span>
            </span>
            <ChevronRight size={20} className="text-muted-foreground" aria-hidden="true" />
          </Link>
        )
      )}

      <section>
        <SectionTitle>Заказать</SectionTitle>
        <OrderTiles hrefFor={(t) => `/documents/new?type=${t}`} />
      </section>

      {apps.length === 0 && (
        <EmptyState icon={<FileText size={24} aria-hidden="true" />} title="Заявок пока нет" text="Закажите справку, и здесь будет видно, на каком она этапе." />
      )}

      <a href={`tel:${DEAN_OFFICE.phone.replace(/[^+\d]/g, "")}`} className="press flex min-h-11 items-center gap-2 text-[13px] text-muted-foreground">
        <Phone size={16} aria-hidden="true" />
        Деканат: {DEAN_OFFICE.room.toLowerCase()}, {DEAN_OFFICE.phone}, {DEAN_OFFICE.hours}
      </a>
    </div>
  );
}
