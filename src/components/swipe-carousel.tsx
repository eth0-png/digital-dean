"use client";

import { Children, useRef, useState, type ReactNode } from "react";

/**
 * Карусель карточек свайпом: нативная прокрутка с привязкой (scroll-snap), поэтому инерция и доводка
 * как в системе телефона. Следующая карточка выглядывает справа, снизу точки. Одна карточка без карусели.
 */
export function SwipeCarousel({ children, label }: { children: ReactNode; label: string }) {
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (slides.length < 2) return <>{slides}</>;

  function onScroll() {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const step = first.offsetWidth + 12; // ширина карточки и промежуток gap-3
    setActive(Math.min(slides.length - 1, Math.round(el.scrollLeft / step)));
  }

  return (
    <section aria-roledescription="карусель" aria-label={label}>
      <div
        ref={track}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:snap-none lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div key={i} role="group" aria-roledescription="слайд" aria-label={`${i + 1} из ${slides.length}`} className="w-[calc(100%-28px)] shrink-0 snap-start lg:w-full [&>*]:h-full">
            {slide}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
        {slides.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-5 bg-primary" : "w-1.5 bg-border"}`} />
        ))}
      </div>
    </section>
  );
}
