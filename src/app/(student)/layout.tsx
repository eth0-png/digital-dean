import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { Logo, CONCEPT_NOTE } from "@/components/logo";
import { BottomNav } from "@/components/bottom-nav";
import { requireStudent } from "@/lib/auth";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-white/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex flex-1 items-center gap-2.5" aria-label="На главную">
          <Logo />
          <span className="font-display text-base font-semibold">деканат</span>
        </Link>
        <Link href="/notifications" aria-label="Уведомления" className="grid size-11 place-items-center rounded-full bg-soft">
          <Bell size={22} aria-hidden="true" />
        </Link>
        <Suspense fallback={<div className="size-11 animate-pulse rounded-full bg-soft" />}>
          <AvatarLink />
        </Suspense>
      </header>
      <main className="flex-1 px-4 pt-2 pb-6">{children}</main>
      <footer className="px-4 pb-28 text-center text-xs text-muted">{CONCEPT_NOTE}</footer>
      <BottomNav />
    </div>
  );
}

async function AvatarLink() {
  const user = await requireStudent();
  return (
    <Link
      href="/profile"
      aria-label="Профиль"
      className="grid size-11 place-items-center rounded-full bg-linear-to-br from-[#FFD0A8] to-[#FF8FB1] text-sm font-extrabold text-[#5A1934]"
    >
      {user.firstName[0]}
      {user.lastName[0]}
    </Link>
  );
}
