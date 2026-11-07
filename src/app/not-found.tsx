import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="enter mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
        <SearchX size={28} aria-hidden="true" />
      </div>
      <h1 className="font-display text-xl font-semibold">Страница не найдена</h1>
      <p className="max-w-[30ch] text-muted-foreground">Возможно, ссылка устарела или у вас нет доступа к этой странице.</p>
      <Button asChild size="lg" className="mt-3 max-w-60">
        <Link href="/">На главную</Link>
      </Button>
    </main>
  );
}
