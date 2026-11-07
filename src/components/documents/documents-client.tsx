"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ChevronDown, MessageCircle, Minus, Phone, Plus, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
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

export type ChatMessage = { id: string; from: "dean" | "me" | "system"; text: string; at: string; read?: string };

/**
 * Переписка с деканатом по заявке, в шторке (вариант Б).
 * В основном экране пузырей нет: шторка открывается кнопкой «Ответить» или пунктом истории.
 * Телефон деканата в шапке шторки. После готовности заявки переписка только для чтения.
 * Шторка сразу на 92% высоты, без промежуточного положения: при раскрытии по нажатию на поле
 * на iPhone одновременно выезжает клавиатура, и получаются два движения подряд.
 */
export function Conversation({
  number,
  messages,
  trigger,
  defaultOpen,
  canReply = true,
}: {
  number: number;
  messages: ChatMessage[];
  trigger: React.ReactNode;
  defaultOpen?: boolean;
  canReply?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [list, setList] = useState(messages);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: "end" });
  }, [open, list.length]);

  function send(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setList((l) => [...l, { id: String(l.length + 1), from: "me", text: t, at: "сейчас", read: "отправлено" }]);
    setText("");
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} repositionInputs>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="mx-auto h-[92dvh] max-w-md rounded-t-[28px] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh]">
        <DrawerHeader className="flex-row items-center gap-2 border-b px-2 pt-2 pb-2.5 text-left">
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label="Свернуть переписку">
              <ChevronDown aria-hidden="true" />
            </Button>
          </DrawerClose>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-extrabold text-accent-foreground">{DEAN_OFFICE.initials}</span>
          <span className="min-w-0 flex-1 pl-1">
            <DrawerTitle className="text-base font-bold">{DEAN_OFFICE.person}</DrawerTitle>
            <DrawerDescription className="text-[13px]">Деканат МП, заявка № {number}</DrawerDescription>
          </span>
          <Button asChild variant="ghost" size="icon" className="text-primary">
            <a href={`tel:${DEAN_OFFICE.phone.replace(/[^+d]/g, "")}`} aria-label={`Позвонить в деканат, ${DEAN_OFFICE.phone}`}>
              <Phone aria-hidden="true" />
            </a>
          </Button>
        </DrawerHeader>

        <div role="log" aria-live="polite" className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
          {list.map((m) =>
            m.from === "system" ? (
              <p key={m.id} className="py-1 text-center text-xs font-semibold text-muted-foreground">
                {m.at}. {m.text}
              </p>
            ) : (
              <div key={m.id} className={`enter flex flex-col ${m.from === "me" ? "items-end" : "items-start"}`}>
                <p
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug ${
                    m.from === "me" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-secondary"
                  }`}
                >
                  {m.text}
                </p>
                <span className="mt-1 px-1 text-[11.5px] text-muted-foreground">
                  {m.at}
                  {m.read ? `, ${m.read}` : ""}
                </span>
              </div>
            ),
          )}
          <div ref={end} />
        </div>

        {canReply ? (
          <form onSubmit={send} className="flex items-end gap-2 border-t px-3 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
            <Label htmlFor="chat-message" className="sr-only">
              Сообщение деканату
            </Label>
            <Textarea
              id="chat-message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              placeholder="Сообщение"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border-0 bg-muted px-4 py-2.5 text-base"
            />
            <Button type="submit" size="icon" className="shrink-0" disabled={!text.trim()} aria-label="Отправить">
              <Send aria-hidden="true" />
            </Button>
          </form>
        ) : (
          <p className="border-t px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] text-center text-[13px] text-muted-foreground">
            Заявка выполнена, переписка закрыта. Остались вопросы, позвоните в деканат.
          </p>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** «Ответить» внутри карточки статуса, когда деканат задал вопрос. */
export function AnswerButton({ number, messages, defaultOpen }: { number: number; messages: ChatMessage[]; defaultOpen?: boolean }) {
  return (
    <Conversation
      number={number}
      messages={messages}
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

/** Пункт истории «Уточнение от деканата»: открывает переписку для чтения. */
export function ConversationLink({ number, messages, defaultOpen }: { number: number; messages: ChatMessage[]; defaultOpen?: boolean }) {
  return (
    <Conversation
      number={number}
      messages={messages}
      defaultOpen={defaultOpen}
      canReply={false}
      trigger={
        <button type="button" className="press mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary">
          <MessageCircle size={18} aria-hidden="true" />
          Открыть переписку
        </button>
      }
    />
  );
}
