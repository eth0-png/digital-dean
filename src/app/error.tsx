"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="enter mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-destructive-soft text-destructive">
        <TriangleAlert size={28} aria-hidden="true" />
      </div>
      <h1 className="font-display text-xl font-semibold">Не получилось загрузить</h1>
      <p className="max-w-[30ch] text-muted-foreground">
        Проверьте интернет и попробуйте ещё раз. Если не помогло, обновите страницу через минуту.
      </p>
      <Button type="button" size="lg" onClick={reset} className="mt-3 max-w-60">
        <RotateCw aria-hidden="true" />
        Повторить
      </Button>
    </main>
  );
}
