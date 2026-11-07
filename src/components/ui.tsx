import type { ReactNode } from "react";

export const btn = {
  primary:
    "inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-br from-brand to-brand-2 px-5 text-base font-bold text-white shadow-[0_10px_24px_-12px_rgba(91,61,245,.7)] transition active:scale-[.98] disabled:opacity-60",
  secondary:
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-soft px-5 text-base font-bold text-ink transition active:scale-[.98] disabled:opacity-60",
};

export const card = "rounded-card border border-line bg-white p-4";

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2.5 font-display text-[15px] font-semibold">{children}</h2>;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card bg-soft px-5 py-8 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-white text-brand">{icon}</div>
      <p className="mt-1 font-bold">{title}</p>
      <p className="max-w-[28ch] text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-soft ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Загрузка">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-44" />
      <Skeleton className="h-24" />
    </div>
  );
}
