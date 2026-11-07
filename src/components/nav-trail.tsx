"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import { cleanUrl, labelFor, markBack, previousOf, recordVisit, subscribeTrail, trailVersion } from "@/lib/nav-trail";

/** Текущий адрес целиком, с параметрами. Компоненты с ним должны стоять внутри <Suspense>. */
export function useCurrentUrl() {
  const path = usePathname();
  const search = useSearchParams();
  return cleanUrl(path, search.toString());
}

/** Перерисовать компонент, когда путь по кабинету изменился. На сервере пути нет. */
export function useTrail() {
  useSyncExternalStore(subscribeTrail, trailVersion, () => 0);
}

/** Записывает путь по кабинету. Стоит в макете студента один раз. */
export function NavTrail() {
  const url = useCurrentUrl();
  useEffect(() => recordVisit(url), [url]);
  useEffect(() => {
    const onPop = () => markBack("*");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return null;
}

/**
 * «Назад» на вложенной странице: на ту страницу, откуда пришли, и подписан её именем.
 * Уже отправленную форму пропускает. Если пришли по ссылке извне, ведёт на fallback.
 */
export function BackLink({ fallbackHref, fallbackLabel }: { fallbackHref: string; fallbackLabel: string }) {
  useTrail();
  const current = useCurrentUrl();
  const prev = previousOf(current, { skipForms: true });
  const href = prev ?? fallbackHref;
  const label = href === fallbackHref ? fallbackLabel : (labelFor(href) ?? fallbackLabel);

  return (
    <Link href={href} transitionTypes={["nav-back"]} onClick={() => markBack(href)} data-back className="-ml-1 inline-flex min-h-11 items-center gap-1 font-bold">
      <ChevronLeft size={22} aria-hidden="true" />
      {label}
    </Link>
  );
}
