import Link from "next/link";
import { SearchX } from "lucide-react";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-soft text-brand">
        <SearchX size={28} aria-hidden="true" />
      </div>
      <h1 className="font-display text-xl font-semibold">Страница не найдена</h1>
      <p className="max-w-[30ch] text-muted">Возможно, ссылка устарела или у вас нет доступа к этой странице.</p>
      <Link href="/" className={`${btn.primary} mt-3 max-w-60`}>
        На главную
      </Link>
    </main>
  );
}
