"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { markBack, previousOf } from "@/lib/nav-trail";
import { useCurrentUrl, useTrail } from "@/components/nav-trail";

/**
 * Кнопка в шапке: первое нажатие открывает страницу, повторное закрывает её
 * и возвращает на ту страницу, откуда открыли, с тем же адресом целиком (включая ?type=...).
 */
export function HeaderToggle({
  href,
  label,
  closeLabel,
  className,
  children,
  openChildren,
}: {
  href: string;
  label: string;
  closeLabel: string;
  className: string;
  children: ReactNode;
  openChildren?: ReactNode;
}) {
  const path = usePathname();
  useTrail();
  const current = useCurrentUrl();
  const open = path === href;
  const back = open ? (previousOf(current, { skipForms: false }) ?? "/") : href;

  return (
    <Link
      href={back}
      transitionTypes={[open ? "nav-back" : "nav-forward"]}
      onClick={() => open && markBack(back)}
      aria-label={open ? closeLabel : label}
      className={`${className} ${open ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    >
      {open && openChildren ? openChildren : children}
    </Link>
  );
}
