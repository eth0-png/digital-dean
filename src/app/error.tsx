"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { btn } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert size={28} aria-hidden="true" />
      </div>
      <h1 className="font-display text-xl font-semibold">Не получилось загрузить</h1>
      <p className="max-w-[30ch] text-muted">Проверьте интернет и попробуйте ещё раз. Если не помогло, обновите страницу через минуту.</p>
      <button type="button" onClick={reset} className={`${btn.primary} mt-3 max-w-60`}>
        <RotateCw size={20} aria-hidden="true" />
        Повторить
      </button>
    </main>
  );
}
