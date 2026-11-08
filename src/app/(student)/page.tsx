import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CalendarDays, CalendarX, ChevronRight, CircleCheck, Clock, GraduationCap, MapPin, MessageCircleQuestion, type LucideIcon } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getToday } from "@/lib/schedule";
import { listMyApplications } from "@/lib/applications";
import { studyAttention } from "@/lib/grades";
import { DOC_TYPES, isCertificate } from "@/lib/documents";
import { PageTransition, Reveal, SectionTitle, stagger } from "@/components/kit";
import { LessonCard } from "@/components/schedule";

export const metadata: Metadata = { title: "Сегодня" };

export default function TodayPage() {
  return (
    <PageTransition>
      <Reveal>
        <Today />
      </Reveal>
    </PageTransition>
  );
}

type Attention = { href: string; icon: LucideIcon; tone: string; title: string; text: string; kind?: string };

/**
 * Главный экран по опросу: ближайшая пара (13 из 23 хотят видеть первой), «требует внимания»
 * только если есть что показать, затем остальные пары дня. На широком экране пары дня справа.
 */
async function Today() {
  const user = await requireStudent();
  const [t, apps] = await Promise.all([getToday(), listMyApplications()]);
  // Учёба: незачёт с пересдачей, свежая оценка, близкий срок
  const study: Attention[] = studyAttention(user.groupName ?? "").map((s) => ({
    href: s.href,
    icon: s.kind === "deadline" ? Clock : GraduationCap,
    tone: s.kind === "debt" ? "bg-destructive-soft text-destructive" : s.kind === "deadline" ? "bg-warning-soft text-warning" : "bg-accent text-primary",
    title: s.title,
    text: s.text,
    kind: s.kind,
  }));

  const attention: Attention[] = [
    ...apps
      .filter((a) => a.status === "need_info")
      .map((a) => ({ href: `/documents/${a.id}`, icon: MessageCircleQuestion, tone: "bg-warning-soft text-warning", title: "Деканат ждёт ответа", text: `${DOC_TYPES[a.type].title}, № ${a.number}` })),
    ...apps
      .filter((a) => a.status === "ready" && a.events.some((e) => e.kind === "ready" && !e.read))
      .map((a) => ({
        href: `/documents/${a.id}`,
        icon: CircleCheck,
        tone: "bg-success-soft text-success",
        title: isCertificate(a.type) ? "Справка готова" : "Заявка выполнена",
        text: `${DOC_TYPES[a.type].title}, № ${a.number}`,
      })),
    // Незачёт важнее остального из учёбы, изменения в расписании важнее свежих оценок и сроков
    ...study.filter((s) => s.kind === "debt"),
    ...t.changes.map((c) => ({
      href: c.href,
      icon: c.kind === "cancelled" ? CalendarX : c.kind === "room" ? MapPin : CalendarClock,
      tone: c.kind === "cancelled" ? "bg-destructive-soft text-destructive" : "bg-warning-soft text-warning",
      title: c.title,
      text: c.text,
    })),
    ...study.filter((s) => s.kind !== "debt"),
  ];
  const n = t.next;

  return (
    <div className="space-y-6">
      <div className="enter">
        <h1 className="font-display text-[22px] leading-tight font-semibold">Привет, {user.firstName}!</h1>
        <p className="mt-1.5 text-muted-foreground first-letter:uppercase">{t.dateText}</p>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-6">
          {/* Ближайшая пара: идёт сейчас или следующая, а если сегодня всё, то первая в следующий учебный день */}
          <Link href="/schedule" transitionTypes={["nav-tab"]} className="press enter block rounded-2xl bg-primary p-[18px] text-primary-foreground" style={stagger(1)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/20 px-3 py-1 text-[13px] font-bold">{n?.state === "now" ? "Идёт сейчас" : "Ближайшая пара"}</span>
              {n?.change && n.change.kind !== "cancelled" && (
                <span className="rounded-full bg-white px-3 py-1 text-[13px] font-bold text-warning">
                  {n.change.kind === "moved" ? `Перенос, была в ${n.change.from}` : "Другая аудитория"}
                </span>
              )}
            </div>
            {n ? (
              <>
                <p className="mt-3 font-display text-xl leading-tight font-semibold">{n.subject}</p>
                <p className="mt-1 text-sm">
                  {n.kind}, {n.place}, {n.teacher}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-[15px] font-bold">
                  <Clock size={18} aria-hidden="true" />
                  <span>
                    {t.when}
                    {n.state !== "now" && <span className="font-semibold">{`, ${n.start}–${n.end}`}</span>}
                  </span>
                </p>
              </>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-[17px] font-bold">
                <CalendarDays size={22} aria-hidden="true" />
                Пар в расписании нет
              </p>
            )}
          </Link>

          {/* Требует внимания: только если есть что показать */}
          {attention.length > 0 && (
            <section className="enter" style={stagger(2)}>
              <SectionTitle>Требует внимания</SectionTitle>
              <ul className="space-y-2">
                {attention.map((a, i) => (
                  <li key={`${a.href}-${a.title}`} className="enter" style={stagger(i + 3)}>
                    <Link href={a.href} transitionTypes={["nav-forward"]} className="press flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${a.tone}`}>
                        <a.icon size={20} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{a.title}</span>
                        <span className="block text-[13px] leading-snug text-muted-foreground">{a.text}</span>
                      </span>
                      <ChevronRight size={20} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Пары дня. Если сегодня пар нет, подсказка про ближайший учебный день */}
        <section className="enter" style={stagger(3)}>
          <SectionTitle>{t.lessons.length > 0 ? "Пары сегодня" : "Сегодня пар нет"}</SectionTitle>
          {t.lessons.length > 0 ? (
            <ul className="space-y-2">
              {t.lessons.map((l, i) => (
                <LessonCard key={`${l.slot}-${l.subject}`} lesson={l} i={i + 4} />
              ))}
            </ul>
          ) : (
            t.nextDay && (
              <Link href={`/schedule?date=${t.nextDay.date}`} transitionTypes={["nav-tab"]} className="press flex items-center gap-3 rounded-xl bg-secondary px-3.5 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-primary">
                  <CalendarDays size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold first-letter:uppercase">{t.nextDay.label}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {t.nextDay.count} {t.nextDay.count === 1 ? "пара" : t.nextDay.count < 5 ? "пары" : "пар"}, первая в {n?.start}
                  </span>
                </span>
                <ChevronRight size={20} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            )
          )}
        </section>
      </div>
    </div>
  );
}
