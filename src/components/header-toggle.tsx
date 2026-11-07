"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const OVERLAYS = ["/profile", "/notifications"];
// Последний раздел, открытый до профиля или уведомлений. Повторное нажатие возвращает туда.
let lastSection = "/";

/** Кнопка в шапке: первое нажатие открывает страницу, повторное закрывает её. */
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
  const open = path === href;

  useEffect(() => {
    if (!OVERLAYS.includes(path)) lastSection = path;
  }, [path]);

  return (
    <Link
      href={open ? lastSection : href}
      transitionTypes={[open ? "nav-back" : "nav-forward"]}
      aria-label={open ? closeLabel : label}
      className={`${className} ${open ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    >
      {open && openChildren ? openChildren : children}
    </Link>
  );
}
