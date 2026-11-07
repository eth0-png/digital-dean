import type { Metadata } from "next";
import { getMyApplication, siteOrigin } from "@/lib/applications";
import { toChat } from "@/lib/documents";
import { BackLink, PageTransition, Reveal, SectionTitle } from "@/components/kit";
import { DocumentCard, StatusCard, Timeline } from "@/components/documents/documents-ui";
import { AnswerButton, ConversationLink, SentToast } from "@/components/documents/documents-client";

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

async function ApplicationView({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { app } = await getMyApplication(id);
  const sent = (await searchParams).sent === "1";
  const need = app.status === "need_info";
  const chat = toChat(app);
  const hasTalk = app.events.some((e) => e.kind === "question" || e.kind === "answer");

  return (
    <div className="space-y-4">
      {sent && <SentToast />}
      <BackLink href="/documents">Документы</BackLink>
      {/* Одна точка входа в переписку: пока ждут ответа, «Ответить» в карточке, потом пункт истории */}
      <StatusCard app={app} action={need ? <AnswerButton appId={app.id} number={app.number} messages={chat} /> : undefined} />
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
        <Timeline app={app} conversation={!need && hasTalk ? <ConversationLink number={app.number} messages={chat} /> : undefined} />
      </section>
    </div>
  );
}
