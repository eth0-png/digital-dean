"use client";

import Link from "next/link";
import { useState } from "react";
import { ChartLine, ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useWide } from "@/components/documents/chat";

export type StatPoint = { n: number; title: string; score: number; current: boolean; href: string };
export type LetterCount = { letter: string; word: string; count: number; pass: boolean };

/**
 * Статистика успеваемости в шторке (на компьютере панелью справа, как переписка): график среднего балла
 * по семестрам, список семестров с переходом и сколько каких оценок. Только свои оценки, без чужих данных.
 * Кнопка открытия строкой под карточкой семестра, сама карточка остаётся чистой.
 */
export function StatsSheet({ points, letters, selected }: { points: StatPoint[]; letters: LetterCount[]; selected: number }) {
  const wide = useWide();
  const [open, setOpen] = useState(false);
  const total = letters.reduce((a, l) => a + l.count, 0);
  return (
    <>
      <button
        type="button"
        data-stats
        onClick={() => setOpen(true)}
        className="press enter flex w-full items-center gap-3 rounded-2xl border bg-card px-3.5 py-3 text-left hover:bg-secondary"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-primary">
          <ChartLine size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Успеваемость</span>
          <span className="block text-[13px] text-muted-foreground">График и все оценки</span>
        </span>
        <ChevronRight size={18} className="text-muted-foreground" aria-hidden="true" />
      </button>
      <Drawer open={open} onOpenChange={setOpen} direction={wide ? "right" : "bottom"}>
        <DrawerContent
          className={
            wide
              ? "h-dvh rounded-l-[28px] data-[vaul-drawer-direction=right]:w-[420px] data-[vaul-drawer-direction=right]:sm:max-w-[420px]"
              : "mx-auto max-h-[92dvh] max-w-md rounded-t-[28px] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh]"
          }
        >
          <DrawerHeader className="flex-row items-center gap-2 border-b px-2 pt-2 pb-2.5 text-left">
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Закрыть статистику">
                {wide ? <X aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
              </Button>
            </DrawerClose>
            <span className="min-w-0 flex-1 pl-1 text-left">
              <DrawerTitle className="text-base font-bold">Успеваемость</DrawerTitle>
              <DrawerDescription className="text-[13px]">Средний балл по семестрам и ваши оценки</DrawerDescription>
            </span>
          </DrawerHeader>

          <div className="space-y-6 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
            {points.length > 1 && <Chart points={points} selected={selected} />}

            <section aria-labelledby="stats-semesters">
              <h3 id="stats-semesters" className="mb-2 font-display text-[15px] font-semibold">
                Семестры
              </h3>
              <ul className="divide-y rounded-xl border">
                {points
                  .slice()
                  .reverse()
                  .map((p) => (
                    <li key={p.n}>
                      <Link
                        href={p.href}
                        scroll={false}
                        transitionTypes={["nav-tab"]}
                        onClick={() => setOpen(false)}
                        aria-current={p.n === selected ? "page" : undefined}
                        className="press flex min-h-12 items-center gap-3 px-3.5 py-2.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold">
                            {p.n} семестр{p.current ? ", сейчас" : ""}
                          </span>
                          <span className="block text-[13px] text-muted-foreground">{p.title}</span>
                        </span>
                        <span className={`font-display text-xl font-semibold tabular-nums ${p.n === selected ? "text-primary" : ""}`}>{p.score}</span>
                        <ChevronRight size={18} className="text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>

            <section aria-labelledby="stats-letters">
              <h3 id="stats-letters" className="mb-2 font-display text-[15px] font-semibold">
                Все оценки
              </h3>
              <ul className="space-y-2">
                {letters.map((l, i) => (
                  <li key={l.letter} className="flex items-center gap-3 text-[14px]">
                    <span className="w-28 shrink-0 font-bold">
                      {l.letter}, {l.word}
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span
                        className={`spark-bar block h-full rounded-full ${l.pass ? "bg-primary" : "bg-destructive"}`}
                        style={{ width: `${(l.count / total) * 100}%`, "--i": i } as React.CSSProperties}
                      />
                    </span>
                    <span className="w-6 text-right font-bold tabular-nums">{l.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

/** График среднего балла: прошлые семестры линией, текущий пунктиром. Линия прорисовывается при открытии шторки. */
function Chart({ points, selected }: { points: StatPoint[]; selected: number }) {
  const W = 320;
  const H = 140;
  const pad = { x: 26, top: 28, bottom: 26 };
  const scores = points.map((p) => p.score);
  const lo = Math.min(...scores) - 2;
  const hi = Math.max(...scores) + 2;
  const x = (i: number) => pad.x + (i * (W - 2 * pad.x)) / (points.length - 1);
  const y = (v: number) => pad.top + ((hi - v) * (H - pad.top - pad.bottom)) / (hi - lo);
  const past = points.filter((p) => !p.current);
  const now = points.at(-1)!;
  const dashed = now.current && past.length > 0;
  const solid = dashed ? past : points;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Средний балл: ${points.map((p) => `${p.current ? "сейчас" : `${p.n} семестр`} ${p.score}`).join(", ")}`}>
        <polyline
          points={solid.map((p, i) => `${x(i)},${y(p.score)}`).join(" ")}
          pathLength={1}
          fill="none"
          className="spark-line stroke-primary"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {dashed && (
          <line
            x1={x(past.length - 1)}
            y1={y(past.at(-1)!.score)}
            x2={x(points.length - 1)}
            y2={y(now.score)}
            className="spark-in stroke-primary"
            style={{ "--i": points.length } as React.CSSProperties}
            strokeWidth="2.5"
            strokeDasharray="4 5"
            strokeLinecap="round"
          />
        )}
        {points.map((p, i) => {
          const on = p.n === selected;
          return (
            <g key={p.n} className="spark-in" style={{ "--i": i } as React.CSSProperties}>
              <circle cx={x(i)} cy={y(p.score)} r={on ? 6 : 4} className={on ? "fill-primary stroke-background" : "fill-background stroke-primary"} strokeWidth="2.5" />
              <text x={x(i)} y={y(p.score) - 11} textAnchor="middle" className={`fill-foreground text-[12px] tabular-nums ${on ? "font-extrabold" : "font-bold"}`}>
                {p.score}
              </text>
              <text x={x(i)} y={H - 6} textAnchor="middle" className={`text-[11px] font-semibold ${on ? "fill-primary" : "fill-muted-foreground"}`}>
                {p.current ? "сейчас" : `${p.n} сем.`}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
