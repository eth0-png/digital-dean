"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONCEPT_NOTE } from "@/components/logo";

/**
 * Экран ошибки. Внутри кабинета (full=false) шапка и меню остаются, ошибка только на месте страницы.
 * «Повторить» вызывает retry(): Next заново загружает данные страницы, а не только перерисовывает её.
 */
export function ErrorView({ retry, full }: { retry: () => void; full?: boolean }) {
  // Внутри кабинета уже есть <main> макета, второй не нужен
  const Tag = full ? "main" : "section";
  return (
    <Tag
      className={`enter mx-auto flex w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center ${full ? "min-h-dvh pb-6" : "min-h-[50dvh]"}`}
    >
      <div className={full ? "mt-auto flex flex-col items-center gap-3" : "contents"}>
        <div className="grid size-14 place-items-center rounded-2xl bg-destructive-soft text-destructive">
          <TriangleAlert size={28} aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-semibold">Не получилось загрузить</h1>
        <p className="max-w-[30ch] text-muted-foreground">Возможно, пропал интернет или сервер не ответил. Попробуйте ещё раз через минуту.</p>
        <Button type="button" size="lg" onClick={() => retry()} className="mt-3 max-w-60">
          <RotateCw aria-hidden="true" />
          Повторить
        </Button>
      </div>
      {full && <p className="mt-auto pt-10 text-xs text-muted-foreground">{CONCEPT_NOTE}</p>}
    </Tag>
  );
}
