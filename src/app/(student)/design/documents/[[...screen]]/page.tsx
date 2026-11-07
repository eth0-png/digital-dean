import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { PageTransition, Reveal, SectionTitle } from "@/components/kit";
import { ApplicationList, ApplicationTracker, DocumentCard, OrderTiles, StatusCard, Timeline } from "@/components/documents/documents-ui";
import { AnswerButton, ConversationLink, OrderForm, type ChatMessage } from "@/components/documents/documents-client";
import { EVENT_TITLE, type Application } from "@/lib/documents";

/** События заявки в сообщения переписки: вопросы и ответы пузырями, этапы системными строками. */
function toChat(app: Application): ChatMessage[] {
  const last = app.events.length - 1;
  return app.events.map((e, i) => ({
    id: String(i),
    from: e.kind === "question" ? "dean" : e.kind === "answer" || e.kind === "message" ? "me" : "system",
    text: e.text ?? EVENT_TITLE[e.kind],
    at: e.at,
    read: e.kind === "answer" && i < last ? "прочитано" : undefined,
  }));
}

// Превью экранов «Документов» на вымышленных примерах, чтобы утвердить дизайн до подключения базы (день 3).
// Открывается только при DESIGN_PREVIEW=1, на сервере переменной нет, там 404.

const QUESTION = "Для какой организации нужна справка? Если для банка, сделаем с печатью.";
const base: Application = {
  id: "2481", number: 2481, type: "study", purpose: "На работу", format: "electronic",
  status: "in_progress", due: "12 ноября",
  events: [{ at: "10 ноября, 09:12", kind: "submitted" }],
};
const APPS: Record<string, Application> = {
  progress: { ...base, events: [...base.events, { at: "10 ноября, 09:40", kind: "in_progress" }] },
  question: {
    ...base, status: "need_info", question: QUESTION,
    events: [...base.events, { at: "10 ноября, 11:40", kind: "question", text: QUESTION }],
  },
  ready: {
    ...base, status: "ready", readyAt: "11 ноября в 14:20, на день раньше срока", verifyCode: "demo-2481",
    events: [
      ...base.events,
      { at: "10 ноября, 11:40", kind: "question", text: QUESTION },
      { at: "10 ноября, 11:52", kind: "answer", text: "Для банка, нужна печать" },
      { at: "10 ноября, 16:05", kind: "in_progress" },
      { at: "11 ноября, 14:20", kind: "ready" },
    ],
  },
};
const OTHERS: Application[] = [
  { ...base, id: "2477", number: 2477, type: "retake", status: "need_info", due: "14 ноября", events: [] },
  { ...base, id: "2460", number: 2460, type: "military", status: "ready", readyAt: "5 ноября", events: [] },
];

const P = "/design/documents";

export default function Page({ params }: PageProps<"/design/documents/[[...screen]]">) {
  return (
    <PageTransition>
      <Reveal>
        <Screen params={params} />
      </Reveal>
    </PageTransition>
  );
}

async function Screen({ params }: { params: Promise<{ screen?: string[] }> }) {
  const user = await requireStudent();
  if (!process.env.DESIGN_PREVIEW) notFound();
  const screen = (await params).screen?.[0] ?? "home";
  const fio = `${user.lastName} ${user.firstName} ${user.middleName ?? ""}`.trim();
  const back = (
    <Link href={P} transitionTypes={["nav-back"]} className="-ml-1 inline-flex min-h-11 items-center gap-1 font-bold">
      <ChevronLeft size={22} aria-hidden="true" />
      Документы
    </Link>
  );

  if (screen === "home")
    return (
      <div className="space-y-5">
        <h1 className="enter font-display text-[22px] font-semibold">Документы</h1>
        <ApplicationTracker app={APPS.progress} href={`${P}/ready`} />
        <section>
          <SectionTitle>Заказать</SectionTitle>
          <OrderTiles hrefFor={() => `${P}/new`} />
        </section>
        <section>
          <SectionTitle>Мои заявки</SectionTitle>
          <ApplicationList apps={OTHERS} hrefFor={(a) => (a.status === "need_info" ? `${P}/question` : `${P}/ready`)} />
        </section>
      </div>
    );

  if (screen === "new")
    return (
      <div>
        {back}
        <h1 className="enter mt-3 font-display text-[22px] leading-tight font-semibold">Справка об обучении</h1>
        <p className="enter mt-1.5 mb-6 text-muted-foreground">Подтверждает, что вы учитесь. Обычно готовят за 1 рабочий день.</p>
        <OrderForm type="study" student={{ fio, course: user.course ?? 1, group: user.groupName ?? "" }} fixHref={`${P}/new`} />
      </div>
    );

  const app = screen === "question" || screen === "chat" ? APPS.question : APPS.ready;
  const need = app.status === "need_info";
  const chat = toChat(app);
  return (
    <div className="space-y-4">
      {back}
      <StatusCard app={app} action={need ? <AnswerButton number={app.number} messages={chat} defaultOpen={screen === "chat"} /> : undefined} />
      {app.status === "ready" && <DocumentCard app={app} openHref={`${P}/ready`} shareUrl={`https://87.242.100.109.sslip.io/verify/${app.verifyCode}`} />}
      <section className="pt-2">
        <SectionTitle>История</SectionTitle>
        {/* Одна точка входа в переписку: пока ждут ответа, это «Ответить» в карточке, потом пункт истории */}
        <Timeline app={app} conversation={need ? undefined : <ConversationLink number={app.number} messages={chat} defaultOpen={screen === "history"} />} />
      </section>
    </div>
  );
}
