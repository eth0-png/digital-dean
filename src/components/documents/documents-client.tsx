"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MapPin, MessageCircle, Minus, Phone, Plus, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { DEAN_OFFICE, DOC_TYPES, PURPOSES, type DocType } from "@/lib/documents";

// Клиентские части раздела «Документы». В превью действия только показывают уведомление, в день 3 подключим серверные действия.

const FORMATS = [
  { value: "electronic", title: "Электронная с QR", text: "Готова в кабинете, можно показать с телефона или отправить ссылкой" },
  { value: "paper", title: "Бумажная", text: `Забрать в деканате, ${DEAN_OFFICE.room.toLowerCase()}` },
];

/** Оформление: отдельная страница (вариант 1), формат карточками (вариант 2), проверка данных (вариант 3). */
export function OrderForm({ type, student, fixHref }: { type: DocType; student: { fio: string; course: number; group: string }; fixHref: string }) {
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [format, setFormat] = useState("electronic");
  const [copies, setCopies] = useState(1);
  const days = DOC_TYPES[type].days;

  function submit(e: FormEvent) {
    e.preventDefault();
    toast.success("Заявка отправлена", { description: `Обычно готовят за ${days} рабочий день. Мы напишем, когда будет готово.` });
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-24">
      <fieldset className="enter space-y-2.5" style={{ "--i": 1 } as React.CSSProperties}>
        <legend className="mb-2.5 text-sm font-bold">Куда нужна справка</legend>
        <ToggleGroup
          type="single"
          value={purpose}
          onValueChange={(v) => v && setPurpose(v)}
          spacing={2}
          className="w-full flex-wrap"
          aria-label="Куда нужна справка"
        >
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

      <fieldset className="enter" style={{ "--i": 2 } as React.CSSProperties}>
        <legend className="mb-2.5 text-sm font-bold">Формат</legend>
        <RadioGroup value={format} onValueChange={setFormat} className="gap-2">
          {FORMATS.map((f) => (
            <Label
              key={f.value}
              htmlFor={`format-${f.value}`}
              className="press flex cursor-pointer items-start gap-3 rounded-xl border-2 border-border p-3.5 font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
            >
              <RadioGroupItem id={`format-${f.value}`} value={f.value} className="mt-0.5 size-5" />
              <span>
                <span className="block font-bold">{f.title}</span>
                <span className="block text-[13px] leading-snug text-muted-foreground">{f.text}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      {format === "paper" && (
        <div className="enter flex items-center justify-between">
          <span className="text-sm font-bold" id="copies">
            Сколько экземпляров
          </span>
          <span className="flex items-center gap-3" aria-labelledby="copies">
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

      <div className="enter rounded-xl border p-3.5" style={{ "--i": 3 } as React.CSSProperties}>
        <p className="text-[13px] font-bold text-muted-foreground">Проверьте данные</p>
        <p className="mt-1">{student.fio}</p>
        <p className="text-muted-foreground">
          {student.course} курс, {student.group}
        </p>
        <Link href={fixHref} transitionTypes={["nav-forward"]} className="mt-2 inline-block min-h-11 py-2.5 text-sm font-extrabold text-primary">
          Нашли ошибку в данных?
        </Link>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t bg-background px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg">
          Отправить заявку
        </Button>
        <p className="mt-2 text-center text-[13px] text-muted-foreground">Обычно готовят за {days} рабочий день</p>
      </div>
    </form>
  );
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
 * «Связаться с деканатом» (идея команды): вместо переписки в интерфейсе одна кнопка и шторка.
 * В шторке ответственный сотрудник, сообщение по заявке и прямые контакты. Тот же компонент отвечает на вопрос деканата.
 */
export function ContactDean({ number, question, defaultOpen, trigger }: { number: number; question?: string; defaultOpen?: boolean; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const reply = Boolean(question);

  function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = String(new FormData(e.currentTarget).get("message") ?? "").trim();
    if (!text) {
      toast.error(reply ? "Напишите ответ" : "Напишите вопрос", { description: "Сообщение пустое, деканату нечего отправить." });
      return;
    }
    setOpen(false);
    toast.success(reply ? "Ответ отправлен" : "Сообщение отправлено", { description: "Ответ деканата придёт в уведомления и появится в истории заявки." });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} repositionInputs>
      <DrawerTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="lg" className="border-2">
            <MessageCircle aria-hidden="true" />
            Связаться с деканатом
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-w-md rounded-t-[28px]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-lg">{reply ? "Ответ деканату" : "Связаться с деканатом"}</DrawerTitle>
          <DrawerDescription>По заявке № {number}</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground">{DEAN_OFFICE.initials}</span>
            <span>
              <span className="block font-bold">{DEAN_OFFICE.person}</span>
              <span className="block text-[13px] text-muted-foreground">{DEAN_OFFICE.role}. Обычно отвечает в течение рабочего дня</span>
            </span>
          </div>

          {question && <p className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm">{question}</p>}

          <form onSubmit={send} className="space-y-2.5">
            <Label htmlFor="message" className="text-sm font-bold">
              {reply ? "Ваш ответ" : "Ваш вопрос по заявке"}
            </Label>
            <Textarea id="message" name="message" rows={3} className="min-h-24 rounded-xl bg-muted text-base" placeholder={reply ? "Например: для банка, нужна печать" : "Например: можно забрать раньше?"} />
            <Button type="submit" size="lg">
              <Send aria-hidden="true" />
              Отправить
            </Button>
          </form>

          <div className="space-y-1 border-t pt-3">
            <p className="text-[13px] font-bold text-muted-foreground">Или напрямую</p>
            <a href={`tel:${DEAN_OFFICE.phone.replace(/[^+\d]/g, "")}`} className="press flex min-h-12 items-center gap-3 rounded-xl px-1">
              <Phone size={20} className="text-primary" aria-hidden="true" />
              <span>
                <span className="block font-bold">{DEAN_OFFICE.phone}</span>
                <span className="block text-[13px] text-muted-foreground">{DEAN_OFFICE.hours}</span>
              </span>
            </a>
            <div className="flex min-h-12 items-center gap-3 px-1">
              <MapPin size={20} className="text-primary" aria-hidden="true" />
              <span>
                <span className="block font-bold">{DEAN_OFFICE.room}, деканат МП</span>
                <span className="block text-[13px] text-muted-foreground">{DEAN_OFFICE.hours}</span>
              </span>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** «Ответить» внутри карточки статуса. Открывает ту же шторку в режиме ответа. */
export function AnswerButton({ number, question, defaultOpen }: { number: number; question: string; defaultOpen?: boolean }) {
  return (
    <ContactDean
      number={number}
      question={question}
      defaultOpen={defaultOpen}
      trigger={
        <Button className="mt-3 w-full bg-background text-primary shadow-none hover:bg-background/90">
          <MessageCircle aria-hidden="true" />
          Ответить
        </Button>
      }
    />
  );
}

/** Тихая кнопка «Написать» в верхней строке страницы заявки, когда деканат ни о чём не спрашивает. */
export function WriteButton({ number, defaultOpen }: { number: number; defaultOpen?: boolean }) {
  return (
    <ContactDean
      number={number}
      defaultOpen={defaultOpen}
      trigger={
        <Button variant="ghost" className="-mr-2 text-primary" aria-label="Написать в деканат">
          <MessageCircle aria-hidden="true" />
          Написать
        </Button>
      }
    />
  );
}
