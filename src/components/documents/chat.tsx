"use client";

import { createContext, use, useEffect, useOptimistic, useRef, useState, useSyncExternalStore, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, LoaderCircle, MessageCircle, Phone, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { withOffline } from "@/components/kit";
import { DEAN_OFFICE, type ChatMessage } from "@/lib/documents";
import { cancelApplication, sendMessage } from "@/app/(student)/documents/actions";

// Переписка по заявке (у студента и у сотрудника одна и та же), отмена заявки, отметка «прочитано».

export type Peer = {
  name: string;
  initials: string;
  about: string;
  phone?: string;
};
export type Compose = {
  label: string;
  placeholder: string;
  /** Сотрудник может отметить, что ждёт ответа: заявка встанет на паузу */
  canAsk?: boolean;
  onSend: (text: string, ask: boolean) => Promise<{ error?: string }>;
};

/**
 * Переписка в шторке, свои сообщения справа. Писать можно, пока заявка открыта.
 * После отправки поле остаётся, сообщение видно сразу, а время и «прочитано» приходят
 * с сервера вместе с ответом действия (refresh() в действии).
 * Шторка сразу на 92% высоты: на iPhone при раскрытии по нажатию на поле выезжает и клавиатура,
 * и получаются два движения подряд.
 *
 * Шторка живёт на уровне страницы (ChatRoot), а кнопки только открывают её. Иначе ответ на вопрос
 * менял статус, кнопка «Ответить» исчезала вместе с открытой перепиской.
 */
type ChatProps = {
  peer: Peer;
  messages: ChatMessage[];
  compose?: Compose;
  closedText: string;
};

const OpenChat = createContext<() => void>(() => {});
const useOpenChat = () => use(OpenChat);

export function ChatRoot({ children, ...chat }: ChatProps & { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <OpenChat value={() => setOpen(true)}>
      {children}
      <Conversation {...chat} open={open} onOpenChange={setOpen} />
    </OpenChat>
  );
}

// На широком экране переписка выезжает справа панелью, на телефоне снизу шторкой
const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (onChange) => {
      const m = matchMedia(WIDE);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => matchMedia(WIDE).matches,
    () => false,
  );
}

function Conversation({ peer, messages, compose, closedText, open, onOpenChange }: ChatProps & { open: boolean; onOpenChange: (v: boolean) => void }) {
  const wide = useWide();
  const [text, setText] = useState("");
  const [ask, setAsk] = useState(false);
  const [pending, start] = useTransition();
  const [list, addSending] = useOptimistic(messages, (l, m: ChatMessage) => [...l, m]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: "end" });
  }, [open, list.length]);

  function send(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !compose || pending) return;
    setText("");
    start(async () => {
      addSending({ id: "sending", from: "me", text: t, at: "отправляется" });
      const { error } = await withOffline(compose.onSend(t, ask));
      if (error) {
        setText(t);
        toast.error("Не отправилось", { description: error });
        return;
      }
      setAsk(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={wide ? "right" : "bottom"} repositionInputs={!wide}>
      <DrawerContent
        className={
          wide
            ? "h-dvh rounded-l-[28px] data-[vaul-drawer-direction=right]:w-[420px] data-[vaul-drawer-direction=right]:sm:max-w-[420px]"
            : "mx-auto h-[92dvh] max-w-md rounded-t-[28px] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh]"
        }
      >
        <DrawerHeader className="flex-row items-center gap-2 border-b px-2 pt-2 pb-2.5 text-left">
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label="Свернуть переписку">
              {wide ? <X aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            </Button>
          </DrawerClose>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-extrabold text-accent-foreground">{peer.initials}</span>
          <span className="min-w-0 flex-1 pl-1 text-left">
            <DrawerTitle className="text-base font-bold">{peer.name}</DrawerTitle>
            <DrawerDescription className="text-[13px]">{peer.about}</DrawerDescription>
          </span>
          {peer.phone && (
            <Button asChild variant="ghost" size="icon" className="text-primary">
              <a href={`tel:${peer.phone.replace(/[^+\d]/g, "")}`} aria-label={`Позвонить, ${peer.phone}`}>
                <Phone aria-hidden="true" />
              </a>
            </Button>
          )}
        </DrawerHeader>

        <div role="log" aria-live="polite" className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-4">
          {list.map((m) =>
            m.from === "system" ? (
              <p key={m.id} className="py-1 text-center text-xs font-semibold text-muted-foreground">
                {m.text}, {m.at}
              </p>
            ) : (
              <div key={m.id} className={`enter flex flex-col ${m.from === "me" ? "items-end" : "items-start"}`}>
                <p
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-line ${
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

        {compose ? (
          <form onSubmit={send} className="border-t px-3 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))]">
            {compose.canAsk && (
              <button
                type="button"
                aria-pressed={ask}
                onClick={() => setAsk((v) => !v)}
                className={`press inline-flex min-h-11 items-center gap-2 px-1 text-[13px] font-bold ${ask ? "text-warning" : "text-muted-foreground"}`}
              >
                <span className={`grid size-5 place-items-center rounded-md border-2 ${ask ? "border-warning bg-warning text-white" : "border-muted-foreground/50"}`}>
                  {ask && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                </span>
                Ответ на сообщение обязателен
              </button>
            )}
            <div className="flex items-end gap-2 pt-1">
              <Label htmlFor="chat-message" className="sr-only">
                {compose.label}
              </Label>
              <Textarea
                id="chat-message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={1}
                maxLength={1000}
                placeholder={compose.placeholder}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border-0 bg-muted px-4 py-2.5 text-base"
              />
              <Button type="submit" size="icon" className="shrink-0" disabled={!text.trim() || pending} aria-label="Отправить">
                {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              </Button>
            </div>
          </form>
        ) : (
          <p className="border-t px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] text-center text-[13px] text-muted-foreground">{closedText}</p>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** Переписка студента с деканатом на странице заявки. Пока заявка открыта, можно писать, на вопрос деканата это ответ. */
export function StudentChat({
  appId,
  number,
  messages,
  active,
  need,
  children,
}: {
  appId: string;
  number: number;
  messages: ChatMessage[];
  active: boolean;
  need: boolean;
  children: ReactNode;
}) {
  return (
    <ChatRoot
      peer={{
        name: DEAN_OFFICE.person,
        initials: DEAN_OFFICE.initials,
        about: `Деканат, заявка № ${number}`,
        phone: DEAN_OFFICE.phone,
      }}
      messages={messages}
      compose={
        active
          ? {
              label: "Сообщение деканату",
              placeholder: need ? "Ваш ответ" : "Сообщение деканату",
              onSend: (t) => sendMessage(appId, t),
            }
          : undefined
      }
      closedText="Заявка закрыта, переписка завершена. Если остались вопросы, позвоните в деканат."
    >
      {children}
    </ChatRoot>
  );
}

/** «Ответить» внутри карточки статуса, когда деканат задал вопрос. */
export function AnswerButton() {
  const open = useOpenChat();
  return (
    <Button className="mt-3 w-full bg-background text-primary hover:bg-background/90" onClick={open}>
      <MessageCircle aria-hidden="true" />
      Ответить
    </Button>
  );
}

/** Пункт истории «Переписка»: открыть переписку или написать первым, пока заявка открыта. */
export function ConversationLink({ empty }: { empty: boolean }) {
  const open = useOpenChat();
  return (
    <button type="button" onClick={open} className="press mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary">
      <MessageCircle size={18} aria-hidden="true" />
      {empty ? "Написать в деканат" : "Открыть переписку"}
    </button>
  );
}

/** Кнопка «Переписка» в панели сотрудника, с числом новых сообщений. */
export function ChatButton({ unread }: { unread: number }) {
  const open = useOpenChat();
  return (
    <Button variant="secondary" className="flex-1" onClick={open}>
      <MessageCircle aria-hidden="true" />
      Переписка
      {unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[12px] text-primary-foreground">{unread}</span>}
    </Button>
  );
}

/** Отмена заявки студентом, с подтверждением. Пока заявку не закрыли. */
export function CancelButton({ appId, number }: { appId: string; number: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function cancel() {
    start(async () => {
      const { error } = await withOffline(cancelApplication(appId));
      if (error) return void toast.error("Не получилось", { description: error });
      setOpen(false);
      toast.success("Заявка отменена");
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full text-destructive hover:bg-destructive-soft hover:text-destructive">
          <X aria-hidden="true" />
          Отменить заявку
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="font-display text-[17px] font-semibold">Отменить заявку № {number}?</DialogTitle>
          <DialogDescription className="text-[14px]">
            Деканат перестанет её готовить, переписка закроется. Если документ снова понадобится, закажите заново.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <DialogClose asChild>
            <Button variant="secondary" className="flex-1">
              Не отменять
            </Button>
          </DialogClose>
          <Button variant="destructive" className="flex-1" onClick={cancel} disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            Отменить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Отметить прочитанным после показа, а не при отрисовке: предзагрузка ссылки не должна ничего отмечать. */
export function MarkRead({ run }: { run: () => Promise<void> }) {
  useEffect(() => {
    run().catch(() => {}); // не получилось отметить, отметится при следующем открытии
  }, [run]);
  return null;
}
