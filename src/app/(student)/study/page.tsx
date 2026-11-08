import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, GraduationCap } from "lucide-react";
import { getStudy } from "@/lib/grades";
import { EmptyState, PageTransition, Reveal, SectionTitle, stagger } from "@/components/kit";
import { ApplicationTabs } from "@/components/documents/documents-client";

export const metadata: Metadata = { title: "Учёба" };

export default function StudyPage({ searchParams }: PageProps<"/study">) {
  return (
    <PageTransition>
      <Reveal>
        <Study searchParams={searchParams} />
      </Reveal>
    </PageTransition>
  );
}

type Grade = { subject: string; sub: string; score: number; letter: string; word: string; pass: boolean; note?: string };

/** Оценка как в МГИМО: балл из 100, буква и слово. Незачёт красным, с датой пересдачи. */
function GradeRow({ g, i }: { g: Grade; i: number }) {
  return (
    <li className="enter flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3" style={stagger(i)}>
      <span className="min-w-0 flex-1">
        <span className="block leading-snug font-bold">{g.subject}</span>
        <span className="block text-[13px] text-muted-foreground">{g.sub}</span>
        {g.note && <span className="mt-1 inline-block rounded-md bg-destructive-soft px-2 py-0.5 text-[12px] font-bold text-destructive">{g.note}</span>}
      </span>
      <span className="shrink-0 text-right tabular-nums">
        <span className={`block font-display text-xl font-semibold ${g.pass ? "" : "text-destructive"}`}>{g.score}</span>
        <span className={`block text-[12px] font-bold ${g.pass ? "text-muted-foreground" : "text-destructive"}`}>
          {g.letter}, {g.word}
        </span>
      </span>
    </li>
  );
}

const List = ({ children }: { children: ReactNode }) => <ul className="space-y-2">{children}</ul>;

/** Две части семестра: на телефоне вкладками, на компьютере рядом. */
function Parts({ parts }: { parts: { value: string; label: string; count: number; content: ReactNode }[] }) {
  return (
    <>
      <div className="lg:hidden">
        <ApplicationTabs tabs={parts} />
      </div>
      <div className="hidden gap-8 lg:grid lg:grid-cols-2">
        {parts.map((p) => (
          <section key={p.value}>
            <SectionTitle>{p.label}</SectionTitle>
            {p.content}
          </section>
        ))}
      </div>
    </>
  );
}

async function Study({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await getStudy((await searchParams).sem);
  if (!s) {
    return <EmptyState icon={<GraduationCap size={24} aria-hidden="true" />} title="Оценок пока нет" text="Когда появятся оценки и расписание сессии, они будут здесь." />;
  }
  const sem = s.semesters.find((x) => x.n === s.selected)!;

  return (
    <div className="space-y-5">
      <h1 className="enter font-display text-[22px] font-semibold">Учёба</h1>

      {/* Семестры как в кабинете МГИМО, текущий первым */}
      <nav aria-label="Семестры" className="enter -mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0" style={stagger(1)}>
        {s.semesters.map((x) => (
          <Link
            key={x.n}
            href={x.current ? "/study" : `/study?sem=${x.n}`}
            transitionTypes={["nav-tab"]}
            scroll={false}
            aria-current={x.n === s.selected ? "page" : undefined}
            className={`press inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[14px] font-bold whitespace-nowrap ${
              x.n === s.selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {x.n} семестр{x.current ? ", сейчас" : ""}
          </Link>
        ))}
      </nav>

      {s.current ? (
        <>
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
            {/* Как дела: долги первыми, потом средний балл и сессия */}
            <section className="enter rounded-2xl bg-primary p-[18px] text-primary-foreground" style={stagger(2)}>
              <span className="rounded-full bg-black/20 px-3 py-1 text-[13px] font-bold">Как дела, {sem.years}</span>
              <p className="mt-3 font-display text-xl leading-tight font-semibold">
                {s.summary.debts.length ? `${s.summary.debts.length} ${s.summary.debts.length === 1 ? "незачёт" : "незачёта"}` : "Долгов нет"}
              </p>
              {s.summary.debts.map((d) => (
                <p key={d.subject} className="mt-1 text-sm">
                  {d.subject}, {d.work}. Пересдача {d.retake}
                </p>
              ))}
              <p className="mt-3 text-sm">
                Средний балл {s.summary.average.of}: <b>{s.summary.average.score}</b>, {s.summary.average.letter}, {s.summary.average.word}
              </p>
              <p className="mt-1 text-sm">{s.summary.session}</p>
            </section>
            {s.summary.deadline && (
              <p className="enter flex items-start gap-3 rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning" style={stagger(3)}>
                <CalendarClock size={20} className="mt-px shrink-0" aria-hidden="true" />
                <span>
                  <b className="block">
                    {s.summary.deadline.title} до {s.summary.deadline.due}
                  </b>
                  {s.summary.deadline.text}
                </span>
              </p>
            )}
          </div>
          <Parts
            parts={[
              {
                value: "mid",
                label: "Текущая аттестация",
                count: s.current.mid.length,
                content: (
                  <List>
                    {s.current.mid.map((m, i) => (
                      <GradeRow key={m.subject + m.work} i={i + 3} g={{ ...m, sub: `${m.work}, ${m.date}`, note: m.pass ? undefined : `Пересдача ${m.retake}` }} />
                    ))}
                  </List>
                ),
              },
              {
                value: "session",
                label: "Сессия",
                count: s.current.session.length,
                content: (
                  <List>
                    {s.current.session.map((x, i) => (
                      <li key={x.subject + x.control} className="enter flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3" style={stagger(i + 3)}>
                        <span className="min-w-0 flex-1">
                          <span className="block leading-snug font-bold">{x.subject}</span>
                          <span className="block text-[13px] text-muted-foreground">
                            {x.control}
                            {x.extra ? ` ${x.extra}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-[14px] font-bold">{x.date}</span>
                      </li>
                    ))}
                  </List>
                ),
              },
            ]}
          />
        </>
      ) : (
        s.past && (
          <>
            <section className="enter rounded-2xl bg-primary p-[18px] text-primary-foreground lg:max-w-md" style={stagger(2)}>
              <span className="rounded-full bg-black/20 px-3 py-1 text-[13px] font-bold">Рейтинг за семестр, {sem.years}</span>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold">{s.past.rating.score}</span>
                <span className="text-[15px] font-bold">
                  {s.past.rating.letter}, {s.past.rating.word}
                </span>
              </p>
              <p className="mt-1 text-sm">{s.past.passed ? "Все экзамены и зачёты сданы" : "Есть несданные дисциплины"}</p>
            </section>
            <Parts
              parts={[
                {
                  value: "exams",
                  label: "Экзамены",
                  count: s.past.exams.length,
                  content: (
                    <List>
                      {s.past.exams.map((g, i) => (
                        <GradeRow key={g.subject} i={i + 3} g={{ ...g, sub: g.extra ? `экзамен ${g.extra}` : "экзамен" }} />
                      ))}
                    </List>
                  ),
                },
                {
                  value: "credits",
                  label: "Зачёты",
                  count: s.past.credits.length,
                  content: (
                    <List>
                      {s.past.credits.map((g, i) => (
                        <GradeRow key={g.subject} i={i + 3} g={{ ...g, sub: g.pass ? "зачтено" : "не зачтено" }} />
                      ))}
                    </List>
                  ),
                },
              ]}
            />
          </>
        )
      )}
    </div>
  );
}
