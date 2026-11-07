import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import { getForStaff } from "@/lib/staff";
import { DOC_TYPES, toChat } from "@/lib/documents";
import { PageTransition, Reveal, SectionTitle } from "@/components/kit";
import { BackLink } from "@/components/nav-trail";
import { StatusCard, Timeline } from "@/components/documents/documents-ui";
import { ChatButton, MarkRead } from "@/components/documents/chat";
import { Facts } from "@/components/staff/staff-ui";
import { StaffActions, StaffChat } from "@/components/staff/staff-client";
import { markRead } from "../actions";

export const metadata: Metadata = { title: "Заявка студента" };

export default function StaffApplicationPage({ params }: PageProps<"/staff/[id]">) {
  return (
    <PageTransition>
      <Reveal>
        <StaffApplication params={params} />
      </Reveal>
    </PageTransition>
  );
}

async function StaffApplication({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { app, student, createdAt, copies, overdue, unread } = await getForStaff(id);
  const doc = DOC_TYPES[app.type];
  return (
    <StaffChat id={app.id} number={app.number} student={student} messages={toChat(app, "staff")} status={app.status}>
      <div className="space-y-4">
        {unread > 0 && <MarkRead run={markRead.bind(null, app.id)} />}
        <BackLink fallbackHref="/staff" fallbackLabel="Очередь" />
        <StatusCard app={app} />
        {overdue && (
          <p role="status" className="enter flex items-center gap-2 rounded-xl bg-destructive-soft px-3.5 py-3 text-sm font-bold text-destructive">
            <TriangleAlert size={18} aria-hidden="true" />
            Срок прошёл {app.due}. Студент ждёт.
          </p>
        )}
        <StaffActions id={app.id} status={app.status} type={app.type} format={app.format} chat={<ChatButton unread={unread} />} />
        <Facts
          title="Студент"
          rows={[
            ["ФИО", student.full],
            ["Группа", student.group],
            ["Курс", student.course ? `${student.course}, ${student.faculty}` : student.faculty],
            ["Студ. билет", student.card],
          ]}
        />
        <Facts
          title="Заявка"
          rows={[
            ["Подана", createdAt],
            ["Цель", app.purpose],
            ["Формат", doc.formats.length ? (app.format === "paper" ? `бумажная, ${copies} экз.` : "электронная с QR") : ""],
            ["Запрос", app.details],
          ]}
        />
        <section className="pt-2">
          <SectionTitle>История</SectionTitle>
          <Timeline app={app} viewer="staff" />
        </section>
      </div>
    </StaffChat>
  );
}
