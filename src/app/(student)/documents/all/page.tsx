import type { Metadata } from "next";
import { CircleCheck, FileText, Hourglass } from "lucide-react";
import { listMyApplications } from "@/lib/applications";
import type { Application } from "@/lib/documents";
import { BackLink, EmptyState, PageTransition, Reveal } from "@/components/kit";
import { ApplicationList } from "@/components/documents/documents-ui";
import { ApplicationTabs } from "@/components/documents/documents-client";

export const metadata: Metadata = { title: "Мои заявки" };

export default function AllApplicationsPage() {
  return (
    <PageTransition>
      <Reveal>
        <AllApplications />
      </Reveal>
    </PageTransition>
  );
}

const isActive = (a: Application) => a.status === "submitted" || a.status === "in_progress" || a.status === "need_info";

async function AllApplications() {
  const apps = await listMyApplications();
  // Первыми заявки, где деканат ждёт ответа, дальше новые сверху
  const sorted = [...apps.filter((a) => a.status === "need_info"), ...apps.filter((a) => a.status !== "need_info")];
  const active = sorted.filter(isActive);
  const done = sorted.filter((a) => !isActive(a));
  const list = (items: Application[], empty: React.ReactNode) =>
    items.length > 0 ? <ApplicationList apps={items} hrefFor={(a) => `/documents/${a.id}`} /> : empty;

  return (
    <div className="space-y-4">
      <BackLink href="/documents">Документы</BackLink>
      <h1 className="enter font-display text-[22px] font-semibold">Мои заявки</h1>
      <ApplicationTabs
        tabs={[
          {
            value: "all",
            label: "Все",
            count: sorted.length,
            content: list(
              sorted,
              <EmptyState icon={<FileText size={24} aria-hidden="true" />} title="Заявок пока нет" text="Закажите справку в «Документах», и она появится здесь." />,
            ),
          },
          {
            value: "active",
            label: "В процессе",
            count: active.length,
            content: list(active, <EmptyState icon={<Hourglass size={24} aria-hidden="true" />} title="Ничего не в работе" text="Все заявки завершены. Новые появятся здесь." />),
          },
          {
            value: "done",
            label: "Готовые",
            count: done.length,
            content: list(done, <EmptyState icon={<CircleCheck size={24} aria-hidden="true" />} title="Готовых пока нет" text="Когда документ будет готов, он появится здесь." />),
          },
        ]}
      />
    </div>
  );
}
