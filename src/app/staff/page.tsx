import type { Metadata } from "next";
import { Inbox, LogOut } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Logo, CONCEPT_NOTE } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { EmptyState, Reveal } from "@/components/kit";

export const metadata: Metadata = { title: "Кабинет сотрудника" };

export default function StaffPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4">
      <header className="flex items-center gap-2.5 py-3">
        <Logo />
        <span className="flex-1 leading-tight">
          <span className="block font-display text-base font-semibold">деканат</span>
          <span className="block text-xs text-muted-foreground">кабинет сотрудника</span>
        </span>
        <form action={logout}>
          <Button type="submit" variant="secondary" className="rounded-full">
            <LogOut aria-hidden="true" />
            Выйти
          </Button>
        </form>
      </header>
      <main className="flex-1 pt-2 pb-6">
        <Reveal>
          <Queue />
        </Reveal>
      </main>
      <footer className="pb-6 text-center text-xs text-muted-foreground">{CONCEPT_NOTE}</footer>
    </div>
  );
}

// Каркас дня 2. Очередь заявок и действия с ними в день 4.
async function Queue() {
  const user = await requireStaff();
  return (
    <div className="space-y-4">
      <h1 className="enter font-display text-[22px] font-semibold">Здравствуйте, {user.firstName}</h1>
      <EmptyState
        icon={<Inbox size={24} aria-hidden="true" />}
        title="Очередь заявок пуста"
        text="Здесь появятся заявки студентов на справки и заявления."
      />
    </div>
  );
}
