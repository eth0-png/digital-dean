import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, GraduationCap } from "lucide-react";
import { getStudy } from "@/lib/grades";
import { EmptyState, PageTransition, Reveal, SectionTitle, stagger } from "@/components/kit";
import { ApplicationTabs } from "@/components/documents/documents-client";
import { StatsSheet } from "@/components/study-stats";

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

type Study = NonNullable<Awaited<ReturnType<typeof getStudy>>>;

const semHref = (n: number, current: boolean) => (current ? "/study" : `/study?sem=${n}`);

/**
 * Выбор семестра: сначала курс, под ним осень и весна этого курса. Влезает в 360 px даже на 4 курсе.
 * Весна текущего курса ещё не началась: видна, но не открывается.
 */
function SemesterPicker({ s }: { s: Study }) {
  const course = s.courses.find((c) => c.semesters.some((x) => x.n === s.selected))!;
  return (
    <div className="enter space-y-3" style={stagger(1)}>
      {s.courses.length > 1 && (
        <nav aria-label="Курсы" className="flex gap-5 border-b">
          {s.courses.map((c) => {
            // Курс открывает свой первый семестр (левый), он всегда уже начался
            const first = c.semesters[0];
            const on = c.course === course.course;
            return (
              <Link
                key={c.course}
                href={semHref(first.n, first.current)}
                transitionTypes={["nav-tab"]}
                scroll={false}
                aria-current={on ? "true" : undefined}
                className={`press -mb-px inline-flex min-h-11 items-center border-b-2 px-0.5 font-display text-[15px] font-semibold ${
                  on ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
                }`}
              >
                {c.course} курс
              </Link>
            );
          })}
        </nav>
      )}
      <nav aria-label="Семестры" className="grid grid-cols-2 gap-2 lg:max-w-md">
        {course.semesters.map((x) => {
          const label = `${x.n} семестр${x.current ? ", сейчас" : ""}`;
          const cls = "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[14px] font-bold whitespace-nowrap";
          if (x.future)
            return (
              <span key={x.n} aria-disabled="true" title="Семестр ещё не начался" className={`${cls} border border-dashed text-muted-foreground`}>
                {label}
              </span>
            );
          const on = x.n === s.selected;
          return (
            <Link
              key={x.n}
              href={semHref(x.n, x.current)}
              transitionTypes={["nav-tab"]}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={`press ${cls} ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Главная карточка семестра: крупно средний балл, под ним только то, что требует внимания,
 * внизу кнопка статистики (разница с прошлым семестром, по нажатию шторка с графиком).
 */
function SemesterCard({ s, title, score, children }: { s: Study; title: string; score: number; children: ReactNode }) {
  const i = s.trend.findIndex((p) => p.n === s.selected);
  const prev = s.trend[i - 1];
  const delta = prev ? s.trend[i].score - prev.score : null;
  const label = delta === null ? "Успеваемость" : delta === 0 ? `Как в ${prev.n} семестре` : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} к ${prev.n} семестру`;
  const points = s.trend.map((p) => ({ ...p, title: s.semesters.find((x) => x.n === p.n)?.title ?? "", href: semHref(p.n, p.current) }));
  return (
    <section className="enter rounded-2xl bg-primary p-[18px] text-primary-foreground" style={stagger(2)}>
      <span className="rounded-full bg-black/20 px-3 py-1 text-[13px] font-bold">{title}</span>
      <p className="mt-3 flex items-baseline gap-2.5">
        <span className="font-display text-[44px] leading-none font-semibold tabular-nums">{score}</span>
        <span className="text-[15px] font-bold">средний балл</span>
      </p>
      {children}
      <StatsSheet label={label} points={points} letters={s.letters} selected={s.selected} />
    </section>
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
      <SemesterPicker s={s} />

      {s.current ? (
        <>
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
            <SemesterCard s={s} title={sem.title} score={s.summary.average}>
              {s.summary.debts.length ? (
                <>
                  <p className="mt-3 font-bold">{s.summary.debts.length === 1 ? "1 незачёт" : `${s.summary.debts.length} незачёта`}</p>
                  {s.summary.debts.map((d) => (
                    <p key={d.subject} className="mt-0.5 text-sm">
                      {d.subject}, {d.work}. Пересдача {d.retake}
                    </p>
                  ))}
                </>
              ) : (
                <p className="mt-3 font-bold">Долгов нет</p>
              )}
            </SemesterCard>
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
            key={sem.n}
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
            <div className="lg:max-w-md">
              <SemesterCard s={s} title={sem.title} score={s.past.score}>
                <p className="mt-3 font-bold">{s.past.passed ? "Все экзамены и зачёты сданы" : "Есть несданные дисциплины"}</p>
              </SemesterCard>
            </div>
            <Parts
              key={sem.n}
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
