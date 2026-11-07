import type { ReactNode } from "react";
import { stagger } from "@/components/kit";
import type { AppEvent, AppStatus, Application } from "@/lib/documents";

// Серверные части кабинета сотрудника. Тексты с точки зрения деканата: «Вопрос студенту», «Ответ студента».

export const STAFF_STATUS: Record<AppStatus, { title: string; badge: "info" | "success" | "warning" | "danger" }> = {
  submitted: { title: "Новая", badge: "info" },
  in_progress: { title: "В работе", badge: "info" },
  need_info: { title: "Ждём студента", badge: "warning" },
  ready: { title: "Готово", badge: "success" },
  rejected: { title: "Отклонено", badge: "danger" },
};

const EVENT: Record<AppEvent["kind"], string> = {
  submitted: "Студент подал заявку",
  in_progress: "Взята в работу",
  question: "Вопрос студенту",
  answer: "Ответ студента",
  message: "Сообщение студента",
  ready: "Готово",
  rejected: "Отклонено",
};

/** Сведения строками «название: значение». Пустые строки не показываем. */
export function Facts({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  return (
    <section className="enter rounded-xl border bg-card p-3.5" style={stagger(2)}>
      <h2 className="mb-2 font-display text-[15px] font-semibold">{title}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

/** Полная история заявки: сотруднику нужна вся переписка сразу, без шторки. Непрочитанные ответы помечены. */
export function StaffHistory({ app }: { app: Application }) {
  return (
    <ol className="relative space-y-4 pl-7 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-0.5 before:bg-border">
      {app.events.map((e, i) => {
        const fromStudent = e.kind === "answer" || e.kind === "message";
        const dot = e.kind === "question" ? "bg-warning" : fromStudent ? "bg-primary" : e.kind === "rejected" ? "bg-destructive" : "bg-success";
        return (
          <li key={i} className="enter relative" style={stagger(i + 3)}>
            <span className={`absolute top-1 -left-7 size-4 rounded-full ring-4 ring-background ${dot}`} />
            <p className="font-bold">
              {EVENT[e.kind]}
              {fromStudent && !e.read && <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 text-[12px] text-accent-foreground">новое</span>}
            </p>
            <p className="text-[13px] text-muted-foreground">{e.at}</p>
            {e.text && <p className={`mt-1.5 rounded-xl px-3.5 py-2.5 text-[15px] leading-snug ${fromStudent ? "bg-accent" : "bg-secondary"}`}>{e.text}</p>}
          </li>
        );
      })}
    </ol>
  );
}
