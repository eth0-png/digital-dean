import type { Metadata } from "next";
import { getMyApplication, siteOrigin } from "@/lib/applications";
import { TALK, fromStudent, isClosed, toChat } from "@/lib/documents";
import { PageTransition, Reveal, SectionTitle } from "@/components/kit";
import { BackLink } from "@/components/nav-trail";
import { DocumentCard, StatusCard, Timeline } from "@/components/documents/documents-ui";
import { SentToast } from "@/components/documents/documents-client";
import { AnswerButton, CancelButton, ConversationLink, MarkRead, StudentChat } from "@/components/documents/chat";
import { markDeanRead } from "../actions";

export const metadata: Metadata = { title: "Заявка" };

export default function ApplicationPage({ params, searchParams }: PageProps<"/documents/[id]">) {
  return (
    <PageTransition>
      <Reveal>
        <ApplicationView params={params} searchParams={searchParams} />
      </Reveal>
    </PageTransition>
  );
}

async function ApplicationView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const { app } = await getMyApplication(id);
  const sent = (await searchParams).sent === "1";
  const need = app.status === "need_info";
  const open = !isClosed(app.status);
  const chat = toChat(app, "student");
  const talk = app.events.filter((e) => TALK.includes(e.kind));
  // Деканат что-то написал или прокомментировал, а студент ещё не видел
  const unseen = app.events.some((e) => !e.read && (e.kind === "in_progress" || e.kind === "ready" || e.kind === "rejected" || (TALK.includes(e.kind) && !fromStudent(e.kind))));

  return (
    <StudentChat appId={app.id} number={app.number} messages={chat} active={open} need={need}>
      <div className="space-y-4">
        {sent && <SentToast />}
        {unseen && <MarkRead run={markDeanRead.bind(null, app.id)} />}
        <BackLink fallbackHref="/documents" fallbackLabel="Документы" />
        {/* Одна точка входа в переписку: пока ждут ответа, «Ответить» в карточке, иначе пункт истории */}
        <StatusCard app={app} action={need ? <AnswerButton /> : undefined} />
        {app.status === "ready" && app.verifyCode && (
          <DocumentCard app={app} openHref={`/documents/${app.id}/document`} shareUrl={`${await siteOrigin()}/verify/${app.verifyCode}`} />
        )}
        {app.details && (
          <p className="enter rounded-xl bg-secondary px-3.5 py-3 text-sm">
            <span className="block text-[13px] font-bold text-muted-foreground">Ваш запрос</span>
            {app.details}
          </p>
        )}
        <section className="pt-2">
          <SectionTitle>История</SectionTitle>
          <Timeline app={app} conversation={!need && (open || talk.length > 0) ? <ConversationLink empty={talk.length === 0} /> : undefined} />
        </section>
        {open && (
          <div className="enter pt-2">
            <CancelButton appId={app.id} number={app.number} />
          </div>
        )}
      </div>
    </StudentChat>
  );
}
