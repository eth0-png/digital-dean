import type { Metadata } from "next";
import { Logo, CONCEPT_NOTE } from "@/components/logo";
import { stagger } from "@/components/kit";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-10">
      <div className="enter flex items-center gap-2.5">
        <Logo size={40} />
        <span className="font-display text-lg font-semibold">деканат</span>
      </div>
      <h1 className="enter mt-8 font-display text-[26px] leading-tight font-semibold" style={stagger(1)}>
        Вход в кабинет
      </h1>
      <p className="enter mt-2 text-muted-foreground" style={stagger(2)}>
        Расписание, оценки и справки в одном месте, с телефона.
      </p>
      <div className="enter" style={stagger(3)}>
        <LoginForm />
      </div>
      <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">{CONCEPT_NOTE}</p>
    </main>
  );
}
