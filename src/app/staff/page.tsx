import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Hourglass, Inbox } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { listQueue, type QueueItem } from "@/lib/staff";
import { DOC_TYPES } from "@/lib/documents";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageTransition, Reveal, stagger } from "@/components/kit";
import { ApplicationTabs } from "@/components/documents/documents-client";
import { STAFF_STATUS } from "@/components/staff/staff-ui";

export const metadata: Metadata = { title: "Кабинет сотрудника" };

export default function StaffPage() {
  return (
    <PageTransition>
      <Reveal>
        <Queue />
      </Reveal>
    </PageTransition>
  );
}

async function Queue() {
  const user = await requireStaff();
  const items = await listQueue();
  const fresh = items.filter((i) => i.app.status === "submitted");
  // В работе: сначала заявки с новым ответом студента, дальше по сроку
  const work = items.filter((i) => i.app.status === "in_progress" || i.app.status === "need_info").sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0));
  const closed = items.filter((i) => i.app.status === "ready" || i.app.status === "rejected").reverse();
  const overdue = items.filter((i) => i.overdue).length;
  const answers = items.filter((i) => i.unread > 0).length;

  return (
    <div className="space-y-4">
      <h1 className="enter font-display text-[22px] font-semibold">Здравствуйте, {user.firstName}</h1>
      <dl className="enter grid grid-cols-3 gap-2" style={stagger(1)}>
        <Stat value={fresh.length} label="новых заявок" />
        <Stat value={answers} label="ответов студентов" />
        <Stat value={overdue} label="просрочено" alert={overdue > 0} />
      </dl>
      <ApplicationTabs
        tabs={[
          {
            value: "new",
            label: "Новые",
            count: fresh.length,
            content: <QueueList items={fresh} empty={<EmptyState icon={<Inbox size={24} aria-hidden="true" />} title="Новых заявок нет" text="Когда студент подаст заявку, она появится здесь." />} />,
          },
          {
            value: "work",
            label: "В работе",
            count: work.length,
            content: <QueueList items={work} empty={<EmptyState icon={<Hourglass size={24} aria-hidden="true" />} title="В работе пусто" text="Возьмите заявку из новых, и она появится здесь." />} />,
          },
          {
            value: "closed",
            label: "Закрытые",
            count: closed.length,
            content: <QueueList items={closed} empty={<EmptyState icon={<CircleCheck size={24} aria-hidden="true" />} title="Закрытых пока нет" text="Здесь будут готовые и отклонённые заявки." />} />,
          },
        ]}
      />
    </div>
  );
}

function Stat({ value, label, alert }: { value: number; label: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${alert ? "bg-destructive-soft text-destructive" : "bg-secondary"}`}>
      <dd className="font-display text-xl font-semibold">{value}</dd>
      <dt className={`text-[12.5px] leading-tight font-semibold ${alert ? "" : "text-muted-foreground"}`}>{label}</dt>
    </div>
  );
}

function QueueList({ items, empty }: { items: QueueItem[]; empty: React.ReactNode }) {
  if (items.length === 0) return empty;
  return (
    <ul className="space-y-2">
      {items.map((i, n) => {
        const s = STAFF_STATUS[i.app.status];
        const badge = i.unread > 0 ? { variant: "info" as const, text: "Новый ответ" } : i.overdue ? { variant: "danger" as const, text: "Просрочено" } : { variant: s.badge, text: s.title };
        return (
          <li key={i.app.id} className="enter" style={stagger(n + 2)}>
            <Link href={`/staff/${i.app.id}`} transitionTypes={["nav-forward"]} className="press flex items-center justify-between gap-3 rounded-xl border bg-card px-3.5 py-3">
              <span className="min-w-0">
                <span className="block font-bold">{DOC_TYPES[i.app.type].title}</span>
                <span className="block text-[13px] text-muted-foreground">
                  {i.student.short}, {i.student.group}
                </span>
                <span className={`block text-[13px] ${i.overdue ? "font-bold text-destructive" : "text-muted-foreground"}`}>
                  № {i.app.number}, {i.app.status === "ready" || i.app.status === "rejected" ? `подана ${i.createdAt.split(",")[0]}` : `срок до ${i.app.due}`}
                </span>
              </span>
              <Badge variant={badge.variant} className="shrink-0">
                {badge.text}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
