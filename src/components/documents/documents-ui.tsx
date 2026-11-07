import Link from "next/link";
import QRCode from "qrcode";
import { ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { stagger } from "@/components/kit";
import { DOC_TYPES, EVENT_TITLE, STATUS, STEPS, type Application, type DocType } from "@/lib/documents";
import { QrDialog } from "./documents-client";

// Серверные части раздела «Документы». Данные приходят пропсами: в день 3 из базы, в превью из примеров.

const chip = "rounded-full bg-black/20 px-3 py-1 text-[12.5px] font-bold";
const progressText = (app: Application) => `${STATUS[app.status].title}, этап ${STATUS[app.status].step + 1} из 3`;

/** Полоса из трёх этапов. Заполняется слева направо при появлении. */
function StepBar({ app, onPrimary }: { app: Application; onPrimary?: boolean }) {
  const step = STATUS[app.status].step;
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={step + 1}
      aria-valuetext={progressText(app)}
      className="mt-4 grid grid-cols-3 gap-1.5"
    >
      {STEPS.map((s, i) => (
        <span key={s} className={`h-1.5 overflow-hidden rounded-full ${onPrimary ? "bg-white/30" : "bg-border"}`}>
          {i <= step && <span className={`grow block h-full rounded-full ${onPrimary ? "bg-white" : "bg-primary"}`} style={stagger(i)} />}
        </span>
      ))}
    </div>
  );
}

/** Главная карточка активной заявки на экране «Документы» (вариант 1). */
export function ApplicationTracker({ app, href }: { app: Application; href: string }) {
  const s = STATUS[app.status];
  return (
    <Link
      href={href}
      transitionTypes={["nav-forward"]}
      className="press enter block rounded-2xl bg-primary p-4 text-primary-foreground shadow-[0_16px_32px_-16px_rgba(37,99,235,.7)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={chip}>{DOC_TYPES[app.type].title}</span>
        <span className={chip}>№ {app.number}</span>
      </div>
      <p className="mt-3 font-display text-xl font-semibold">{s.title}</p>
      <p className="mt-0.5 text-sm">{app.status === "need_info" ? s.sub : `Будет готово до ${app.due}`}</p>
      <StepBar app={app} onPrimary />
      <div className="mt-1.5 grid grid-cols-3 text-xs font-bold">
        {STEPS.map((label, i) => (
          <span key={label} className={i === 1 ? "text-center" : i === 2 ? "text-right" : ""}>
            {label}
          </span>
        ))}
      </div>
    </Link>
  );
}

/** Заказ плитками (вариант 1): крупная самая частая справка, остальные меньше. */
export function OrderTiles({ hrefFor }: { hrefFor: (t: DocType) => string }) {
  const tile = "press enter flex rounded-xl bg-secondary p-3.5";
  const icon = (t: DocType) => {
    const Icon = DOC_TYPES[t].icon;
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-primary">
        <Icon size={20} aria-hidden="true" />
      </span>
    );
  };
  const text = (t: DocType) => (
    <span>
      <span className="block text-[14.5px] leading-tight font-extrabold">{DOC_TYPES[t].short}</span>
      <span className="mt-0.5 block text-[12.5px] font-semibold text-muted-foreground">{DOC_TYPES[t].hint}</span>
    </span>
  );
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Link href={hrefFor("study")} transitionTypes={["nav-forward"]} className={`${tile} col-span-2 items-center gap-3 bg-accent`} style={stagger(1)}>
        {icon("study")}
        {text("study")}
        <span className="ml-auto grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ChevronRight size={22} aria-hidden="true" />
        </span>
      </Link>
      {(["military", "retake"] as const).map((t, i) => (
        <Link key={t} href={hrefFor(t)} transitionTypes={["nav-forward"]} className={`${tile} min-h-28 flex-col justify-between`} style={stagger(i + 2)}>
          {icon(t)}
          {text(t)}
        </Link>
      ))}
      <Link href={hrefFor("data_fix")} transitionTypes={["nav-forward"]} className={`${tile} col-span-2 items-center gap-3`} style={stagger(4)}>
        {icon("data_fix")}
        {text("data_fix")}
      </Link>
    </div>
  );
}

/** Остальные заявки строками. Где ждут ответа студента, строка выделена. */
export function ApplicationList({ apps, hrefFor }: { apps: Application[]; hrefFor: (a: Application) => string }) {
  return (
    <ul className="space-y-2">
      {apps.map((a, i) => {
        const s = STATUS[a.status];
        const need = a.status === "need_info";
        return (
          <li key={a.id} className="enter" style={stagger(i + 5)}>
            <Link
              href={hrefFor(a)}
              transitionTypes={["nav-forward"]}
              className={`press flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${need ? "border-warning/25 bg-warning-soft" : "bg-card"}`}
            >
              <span>
                <span className="block font-bold">{DOC_TYPES[a.type].title}</span>
                <span className="block text-[13px] text-muted-foreground">
                  № {a.number}, {need ? "деканат задал вопрос" : a.status === "ready" ? `готово ${a.readyAt}` : `до ${a.due}`}
                </span>
              </span>
              <Badge variant={s.badge}>{need ? "Нужен ответ" : s.title}</Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Карточка статуса на странице заявки (вариант 2): этапы точками, текущий с ореолом. */
export function StatusCard({ app }: { app: Application }) {
  const s = STATUS[app.status];
  const ready = app.status === "ready";
  const need = app.status === "need_info";
  return (
    <section className="enter rounded-2xl bg-primary p-4 text-primary-foreground shadow-[0_16px_32px_-16px_rgba(37,99,235,.7)]">
      <div className="flex items-center justify-between gap-2">
        <span className={chip}>{DOC_TYPES[app.type].title}</span>
        <span className={chip}>№ {app.number}</span>
      </div>
      <p className="mt-3 font-display text-[21px] font-semibold">{ready ? "Справка готова" : s.title}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm">
        {!ready && !need && <Clock size={16} aria-hidden="true" />}
        {ready ? app.readyAt : need ? s.sub : `Будет готово до ${app.due}`}
      </p>
      <div role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={s.step + 1} aria-valuetext={progressText(app)} className="mt-4 flex items-center">
        {STEPS.map((label, i) => {
          const done = i < s.step || ready;
          const now = i === s.step && !ready;
          return (
            <span key={label} className={`flex items-center ${i < 2 ? "flex-1" : ""}`}>
              <span className="relative grid size-3.5 shrink-0 place-items-center">
                {now && <span className={`halo absolute inset-0 rounded-full ${need ? "bg-alert" : "bg-white"}`} />}
                <span className={`relative size-3.5 rounded-full ${done ? "bg-white" : now ? (need ? "bg-alert" : "bg-white") : "border-2 border-white"}`} />
              </span>
              {i < 2 && <span className={`mx-1.5 h-[3px] flex-1 rounded-full ${i < s.step || ready ? "bg-white" : "bg-[repeating-linear-gradient(90deg,#fff_0_6px,transparent_6px_11px)]"}`} />}
            </span>
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-3 text-xs font-bold">
        {STEPS.map((label, i) => (
          <span key={label} className={`${i === 1 ? "text-center" : i === 2 ? "text-right" : ""} ${i > s.step && !ready ? "font-semibold" : ""}`}>
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

/** История заявки линией (вариант 1). Вопросы и ответы цитатой, а не перепиской. Будущий этап виден. */
export function Timeline({ app }: { app: Application }) {
  const pending = app.status !== "ready" && app.status !== "rejected";
  // Открытый вопрос уже показан крупно над историей, здесь без повтора текста
  const openQuestion = app.status === "need_info" ? app.events.findLastIndex((e) => e.kind === "question") : -1;
  return (
    <ol className="relative space-y-4 pl-7 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-0.5 before:bg-border">
      {app.events.map((e, i) => {
        const quote = e.kind === "question" || e.kind === "answer" || e.kind === "message";
        const dot = e.kind === "question" ? "bg-alert" : e.kind === "ready" ? "bg-success" : quote ? "bg-primary" : "bg-success";
        return (
          <li key={i} className="enter relative" style={stagger(i + 1)}>
            <span className={`absolute top-1 -left-7 size-4 rounded-full ring-4 ring-background ${dot}`} />
            <p className="font-bold">{EVENT_TITLE[e.kind]}</p>
            <p className="text-[13px] text-muted-foreground">{e.at}</p>
            {e.text && i !== openQuestion && <p className={`mt-1.5 rounded-xl px-3 py-2 text-sm ${quote ? "bg-secondary" : ""}`}>{e.text}</p>}
          </li>
        );
      })}
      {pending && (
        <li className="enter relative" style={stagger(app.events.length + 1)}>
          <span className="absolute top-1 -left-7 size-4 rounded-full border-2 border-dashed border-muted-foreground bg-background ring-4 ring-background" />
          <p className="font-bold text-muted-foreground">Готово</p>
          <p className="text-[13px] text-muted-foreground">Ожидается до {app.due}</p>
        </li>
      )}
    </ol>
  );
}

/** Готовая справка как лист бумаги (вариант 3) с настоящим QR-кодом и пометкой «Демо». */
export async function DocumentCard({ app, fio, course, verifyUrl, openHref }: { app: Application; fio: string; course: number; verifyUrl: string; openHref: string }) {
  const svg = await QRCode.toString(verifyUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0e1a33", light: "#ffffff" } });
  return (
    <section className="enter space-y-3" style={stagger(1)}>
      <div className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-[0_14px_30px_-18px_rgba(14,26,51,.45)]">
        <p className="text-[11.5px] font-bold tracking-wide text-muted-foreground">ДЕКАНАТ МЕЖДУНАРОДНО-ПРАВОВОГО ФАКУЛЬТЕТА</p>
        <p className="mt-2 font-display text-[15px] font-semibold">СПРАВКА № {app.number}</p>
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-[13px]">
          <dt className="text-muted-foreground">Выдана:</dt>
          <dd className="font-semibold">{fio}</dd>
          <dt className="text-muted-foreground">Курс:</dt>
          <dd className="font-semibold">{course}, очная форма</dd>
        </dl>
        <div className="mt-2 h-1.5 rounded-full bg-muted" />
        <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-muted" />
        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="rounded-lg border-2 border-destructive px-2 py-1 text-[11px] leading-tight font-extrabold text-destructive">
            ДЕМО, ЮРИДИЧЕСКОЙ
            <br />
            СИЛЫ НЕ ИМЕЕТ
          </span>
          <span className="size-[76px] shrink-0 [&_svg]:size-full" aria-label="QR-код для проверки подлинности" role="img" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 -rotate-[16deg] text-center font-display text-[44px] font-bold tracking-[.1em] text-destructive/[.07]">
          ДЕМО
        </span>
      </div>
      <QrDialog svg={svg} openHref={openHref} />
    </section>
  );
}
