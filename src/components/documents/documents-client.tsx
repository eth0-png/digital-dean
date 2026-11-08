"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LoaderCircle, Minus, Plus, Share2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEAN_OFFICE, DOC_TYPES, PURPOSES, type DocType, type Format } from "@/lib/documents";
import { createApplication, type OrderState } from "@/app/(student)/documents/actions";

// Клиентские части раздела «Документы»: форма заказа, «Поделиться», вкладки. Переписка в chat.tsx.

const FORMATS: Record<Format, { title: string; text: string }> = {
  electronic: { title: "Электронная с QR", text: "Готова в кабинете, можно показать с телефона или отправить ссылкой" },
  paper: { title: "Бумажная", text: `Забрать в деканате, ${DEAN_OFFICE.room.toLowerCase()}` },
};

const step = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** Оформление: отдельная страница (вариант 1), формат карточками (вариант 2), проверка данных (вариант 3). */
export function OrderForm({ type, student }: { type: DocType; student: { fio: string; course: number; group: string } }) {
  const cfg = DOC_TYPES[type];
  const [state, action, pending] = useActionState<OrderState, FormData>(createApplication, {});
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [format, setFormat] = useState<Format>(cfg.formats[0] ?? "electronic");
  const [copies, setCopies] = useState(1);

  return (
    <form action={action} className="space-y-6 pb-28 lg:pb-0" noValidate>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="purpose" value={purpose} />
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="copies" value={copies} />

      {cfg.purpose && (
        <fieldset className="enter" style={step(1)}>
          <legend className="mb-2.5 text-sm font-bold">Куда нужна справка</legend>
          <ToggleGroup type="single" value={purpose} onValueChange={(v) => v && setPurpose(v)} spacing={2} className="w-full flex-wrap" aria-label="Куда нужна справка">
            {PURPOSES.map((p) => (
              <ToggleGroupItem
                key={p}
                value={p}
                className="press h-11 rounded-full border-2 border-border px-4 text-sm font-bold data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              >
                {p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>
      )}

      {cfg.formats.length > 1 && (
        <fieldset className="enter" style={step(2)}>
          <legend className="mb-2.5 text-sm font-bold">Формат</legend>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as Format)} className="gap-2">
            {cfg.formats.map((f) => (
              <Label
                key={f}
                htmlFor={`format-${f}`}
                className="press flex cursor-pointer items-start gap-3 rounded-xl border-2 border-border p-3.5 font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
              >
                <RadioGroupItem id={`format-${f}`} value={f} className="mt-0.5 size-5" />
                <span>
                  <span className="block font-bold">{FORMATS[f].title}</span>
                  <span className="block text-[13px] leading-snug text-muted-foreground">{FORMATS[f].text}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
      )}

      {format === "paper" && cfg.formats.includes("paper") && (
        <div className="enter flex items-center justify-between" style={step(2)}>
          <span className="text-sm font-bold" id="copies">
            Сколько экземпляров
          </span>
          <span className="flex items-center gap-3" role="group" aria-labelledby="copies">
            <Button type="button" variant="secondary" size="icon" className="rounded-xl" onClick={() => setCopies((c) => Math.max(1, c - 1))} aria-label="Меньше">
              <Minus aria-hidden="true" />
            </Button>
            <span className="w-5 text-center font-display text-lg" aria-live="polite">
              {copies}
            </span>
            <Button type="button" variant="secondary" size="icon" className="rounded-xl" onClick={() => setCopies((c) => Math.min(5, c + 1))} aria-label="Больше">
              <Plus aria-hidden="true" />
            </Button>
          </span>
        </div>
      )}

      {cfg.details && (
        <div className="enter space-y-2" style={step(1)}>
          <Label htmlFor="details" className="text-sm font-bold">
            {cfg.details.label}
          </Label>
          <Textarea id="details" name="details" rows={3} maxLength={1000} placeholder={cfg.details.placeholder} className="min-h-24 rounded-xl border-0 bg-muted px-4 py-3 text-base" />
        </div>
      )}

      {type !== "data_fix" && (
        <div className="enter rounded-xl border p-3.5" style={step(3)}>
          <p className="text-[13px] font-bold text-muted-foreground">Проверьте данные</p>
          <p className="mt-1">{student.fio}</p>
          <p className="text-muted-foreground">
            {student.course} курс, {student.group}
          </p>
          <Link href="/documents/new?type=data_fix" transitionTypes={["nav-forward"]} className="mt-2 inline-block min-h-11 py-2.5 text-sm font-extrabold text-primary">
            Нашли ошибку в данных?
          </Link>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t bg-background px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:max-w-none lg:border-0 lg:p-0">
        {state.error && (
          <p role="alert" className="enter mb-2.5 flex items-start gap-2 rounded-xl bg-destructive-soft px-3.5 py-2.5 text-sm font-semibold text-destructive">
            <TriangleAlert size={18} className="mt-px shrink-0" aria-hidden="true" />
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending ? "Отправляем…" : "Отправить заявку"}
        </Button>
        <p className="mt-2 text-center text-[13px] text-muted-foreground">
          Обычно {cfg.days === 1 ? "1 рабочий день" : `${cfg.days} рабочих дня`}
        </p>
      </div>
    </form>
  );
}

/** Уведомление «Заявка отправлена» после перехода с формы. Убирает ?sent=1 из адреса. */
export function SentToast() {
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    toast.success("Заявка отправлена", { description: "Мы напишем, когда документ будет готов." });
    router.replace(path, { scroll: false });
  }, [router, path]);
  return null;
}

/** «Поделиться»: системное меню телефона, а где его нет, ссылка копируется. */
export function ShareButton({ title, url }: { title: string; url: string }) {
  async function share() {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Ссылка скопирована", { description: "По ней можно проверить подлинность справки." });
  }
  return (
    <Button type="button" variant="secondary" size="icon" className="size-13 rounded-xl" onClick={share} aria-label="Поделиться справкой">
      <Share2 aria-hidden="true" />
    </Button>
  );
}

/**
 * Вкладки раздела «Мои заявки» в виде переключателя-пилюли, как в iOS.
 * Белая подложка скользит к выбранной вкладке, ширина вкладок по содержимому, поэтому
 * у длинной «В процессе» отступы такие же, как у короткой «Все». Нажимается вся высота 44 px,
 * а видимая подложка 36 px. Список при смене вкладки въезжает с той стороны, куда переключили.
 */
export function ApplicationTabs({ tabs }: { tabs: { value: string; label: string; count: number; content: React.ReactNode }[] }) {
  // Выбранная вкладка в адресе (?tab=): после «назад» из заявки открывается та же вкладка, а не первая
  const search = useSearchParams();
  const fromUrl = search.get("tab");
  const pick = (v: string | null) => tabs.find((t) => t.value === v)?.value ?? tabs[0].value;
  const [chosen, setValue] = useState(() => pick(fromUrl));
  // Адрес сменился снаружи (ссылка на тот же раздел без ?tab=, «назад»): вкладка следует за адресом
  const [seen, setSeen] = useState(fromUrl);
  if (fromUrl !== seen) {
    setSeen(fromUrl);
    setValue(pick(fromUrl));
  }
  // Набор вкладок мог смениться (другой семестр в «Учёбе»): выбора нет среди вкладок, значит, открыта первая
  const value = tabs.some((t) => t.value === chosen) ? chosen : tabs[0].value;
  // Подписи и числа могут смениться без смены вкладки (очередь обновляется сама): подложку меряем заново
  const labels = tabs.map((t) => `${t.label} ${t.count}`).join("|");
  const [dir, setDir] = useState<"left" | "right">("right");
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = list.current?.querySelector<HTMLElement>('[data-state="active"]');
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, labels]);

  function change(next: string) {
    const from = tabs.findIndex((t) => t.value === value);
    const to = tabs.findIndex((t) => t.value === next);
    setDir(to > from ? "right" : "left");
    setValue(next);
    const params = new URLSearchParams(window.location.search);
    if (next === tabs[0].value) params.delete("tab");
    else params.set("tab", next);
    const q = params.toString();
    window.history.replaceState(null, "", q ? `${window.location.pathname}?${q}` : window.location.pathname);
  }

  return (
    <Tabs value={value} onValueChange={change} className="gap-4">
      <TabsList ref={list} className="relative isolate flex w-full gap-0 rounded-full bg-secondary p-1 group-data-horizontal/tabs:h-[52px]">
        {pill && (
          <span
            aria-hidden="true"
            className="absolute top-1 bottom-1 rounded-full bg-background transition-[left,width] duration-[260ms] ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{ left: pill.left, width: pill.width }}
          />
        )}
        {tabs.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className={`relative z-10 h-11 flex-auto rounded-full border-0 px-3.5 text-[14px] font-bold text-muted-foreground transition-colors duration-200 data-[state=active]:text-foreground ${
              pill ? "data-[state=active]:bg-transparent" : "data-[state=active]:bg-background"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-[12.5px] font-semibold">{t.count}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value}>
          <div className={`animate-in fade-in duration-200 ${dir === "right" ? "slide-in-from-right-4" : "slide-in-from-left-4"}`}>{t.content}</div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
