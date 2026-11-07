"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { btn } from "@/components/ui";
import { login, type LoginState } from "./actions";

const field =
  "h-13 w-full rounded-2xl border-2 border-transparent bg-soft px-4 text-base text-ink outline-none transition placeholder:text-muted focus:border-brand focus:bg-white";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="mt-7 space-y-4" noValidate>
      <div>
        <label htmlFor="login" className="mb-1.5 block text-sm font-bold">
          Логин
        </label>
        {/* Шрифт 16 px, иначе iPhone увеличивает страницу. Без автозаглавной буквы и автозамены. */}
        <input
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
          className={field}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-bold">
          Пароль
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            required
            className={`${field} pr-14`}
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "login-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-1 grid w-12 place-items-center rounded-xl text-muted"
            aria-label={show ? "Скрыть пароль" : "Показать пароль"}
            aria-pressed={show}
          >
            {show ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {state.error && (
        <p id="login-error" role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          <TriangleAlert size={18} className="mt-px shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={btn.primary}>
        {pending && <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />}
        {pending ? "Входим" : "Войти"}
      </button>
    </form>
  );
}
