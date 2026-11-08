import Link from "next/link";
import { Suspense, ViewTransition, type CSSProperties, type ReactNode } from "react";
import { SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CONCEPT_NOTE } from "@/components/logo";

/**
 * «Страница не найдена»: чужая заявка, кривой адрес. Внутри кабинета (full=false) шапка остаётся,
 * на весь экран (несуществующий адрес) с плашкой «концепт».
 */
export function NotFoundView({ full }: { full?: boolean }) {
  // Внутри кабинета уже есть <main> макета, второй не нужен
  const Tag = full ? "main" : "section";
  return (
    <Tag className={`enter mx-auto flex w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center ${full ? "min-h-dvh pb-6" : "min-h-[50dvh]"}`}>
      <div className={full ? "mt-auto flex flex-col items-center gap-3" : "contents"}>
        <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          <SearchX size={28} aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-semibold">Страница не найдена</h1>
        <p className="max-w-[30ch] text-muted-foreground">Возможно, ссылка устарела или у вас нет доступа к этой странице.</p>
        <Button asChild size="lg" className="mt-3 max-w-60">
          <Link href="/">На главную</Link>
        </Button>
      </div>
      {full && <p className="mt-auto pt-10 text-xs text-muted-foreground">{CONCEPT_NOTE}</p>}
    </Tag>
  );
}


/**
 * Действие сервера с понятной ошибкой, если пропала связь: без этого обрыв сети роняет страницу на экран ошибки,
 * а так сообщение показывается рядом, и введённый текст не теряется.
 */
export const withOffline = <T extends { error?: string }>(action: Promise<T>) =>
  action.catch((): T => ({ error: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз." }) as T);

/** Порядковый номер для появления по очереди: <div className="enter" style={stagger(2)}> */
export const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2.5 font-display text-[15px] font-semibold">{children}</h2>;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="enter flex flex-col items-center gap-2 rounded-xl bg-secondary px-5 py-8 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-background text-primary">{icon}</div>
      <p className="mt-1 font-bold">{title}</p>
      <p className="max-w-[28ch] text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-dvh space-y-4" aria-busy="true" aria-label="Загрузка">
      <Skeleton className="h-8 w-2/3 rounded-xl bg-secondary" />
      <Skeleton className="h-4 w-1/2 rounded-xl bg-secondary" />
      <Skeleton className="h-44 rounded-2xl bg-secondary" />
      <Skeleton className="h-24 rounded-xl bg-secondary" />
    </div>
  );
}

/** Загрузка: скелет сразу, содержимое коротко проявляется на его месте. */
export function Reveal({ children, fallback = <PageSkeleton /> }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <ViewTransition enter="fade-in" default="none">
        <div>{children}</div>
      </ViewTransition>
    </Suspense>
  );
}

const NAV_TYPES = { "nav-forward": "nav-forward", "nav-back": "nav-back", "nav-tab": "nav-tab", default: "none" };

/** Переход между страницами: вглубь сдвиг влево, назад вправо, вкладки плавной сменой. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={NAV_TYPES} exit={NAV_TYPES} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
