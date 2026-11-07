"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);
  const invalid = state.error ? true : undefined;
  const describedBy = state.error ? "login-error" : undefined;

  return (
    <form action={action} className="mt-7 space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="login" className="text-sm font-bold">
          Логин
        </Label>
        {/* Шрифт 16 px, иначе iPhone увеличивает страницу. Без автозаглавной буквы и автозамены. */}
        <Input
          id="login"
          name="login"
          key={state.login}
          defaultValue={state.login}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          required
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-bold">
          Пароль
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            required
            className="pr-14"
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-1 my-auto text-muted-foreground"
            aria-label={show ? "Скрыть пароль" : "Показать пароль"}
            aria-pressed={show}
          >
            {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {state.error && (
        <p
          id="login-error"
          role="alert"
          className="enter flex items-start gap-2 rounded-xl bg-destructive-soft px-4 py-3 text-sm font-semibold text-destructive"
        >
          <TriangleAlert size={18} className="mt-px shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {pending ? "Входим" : "Войти"}
      </Button>
    </form>
  );
}
