import type { ReactNode } from "react";
import { stagger } from "@/components/kit";
import type { AppStatus } from "@/lib/documents";

// Серверные части кабинета сотрудника. Статусы с точки зрения деканата: «Новая», «Ждём студента».

export const STAFF_STATUS: Record<AppStatus, { title: string; badge: "info" | "success" | "warning" | "danger" | "secondary" }> = {
  submitted: { title: "Новая", badge: "info" },
  in_progress: { title: "В работе", badge: "info" },
  need_info: { title: "Ждём студента", badge: "warning" },
  ready: { title: "Готово", badge: "success" },
  rejected: { title: "Отклонено", badge: "danger" },
  cancelled: { title: "Отменена", badge: "secondary" },
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
