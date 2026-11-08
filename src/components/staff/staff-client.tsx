"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CircleCheck, LoaderCircle, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stagger, withOffline } from "@/components/kit";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { Names } from "@/lib/staff";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { isCertificate, isClosed, type AppStatus, type ChatMessage, type DocType, type Format } from "@/lib/documents";
import { issue, reject, sendReply, takeInWork } from "@/app/staff/actions";
import { ChatRoot } from "@/components/documents/chat";

type Result = { error?: string };

/** Действие с текстом в окне: отказ с причиной, комментарий к готовому документу. */
function TextAction({
  trigger,
  title,
  text,
  label,
  placeholder,
  submit,
  done,
  required,
  fields,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  text: string;
  label: string;
  placeholder: string;
  submit: string;
  done: string;
  required?: string;
  fields?: ReactNode; // поля над комментарием, читаются из формы
  onSubmit: (text: string, form: FormData) => Promise<Result>;
}) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function send(e: FormEvent) {
    e.preventDefault();
    if (required && value.trim().length < 3) return setError(required);
    const form = new FormData(e.currentTarget as HTMLFormElement);
    start(async () => {
      const r = await withOffline(onSubmit(value, form));
      if (r.error) return setError(r.error);
      setOpen(false);
      setValue("");
      toast.success(done);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setError(undefined);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0">
        <form onSubmit={send} onChange={() => setError(undefined)} className="grid gap-4 p-4">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-[14px]">{text}</DialogDescription>
          </DialogHeader>
          {fields}
          <div className="grid gap-1.5">
            <Label htmlFor={id} className="text-[13px] font-bold">
              {label}
            </Label>
            <Textarea
              id={id}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(undefined);
              }}
              rows={3}
              maxLength={1000}
              placeholder={placeholder}
              aria-invalid={Boolean(error) && !fields}
              aria-describedby={error ? `${id}-error` : undefined}
              className="min-h-24 text-base"
            />
            {error && (
              <p id={`${id}-error`} role="alert" className="text-[13px] font-semibold text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 flex-row gap-2 rounded-none border-0 bg-transparent p-0 sm:justify-stretch">
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="flex-1">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ISSUE_HINT: Record<DocType, string> = {
  study: "Например: справка подписана, бумажная копия в каб. 2105",
  military: "Например: забрать в каб. 2105, пн–пт 10:00–17:00",
  retake: "Например: пересдача 18 ноября в 10:00, ауд. 305",
  data_fix: "Например: отчество исправлено по паспорту",
};

/** Переписка со студентом на странице заявки: та же шторка, что у студента, свои сообщения справа. */
export function StaffChat({
  id,
  number,
  student,
  messages,
  status,
  children,
}: {
  id: string;
  number: number;
  student: { name: string; initials: string; avatar: string | null; group: string };
  messages: ChatMessage[];
  status: AppStatus;
  children: ReactNode;
}) {
  return (
    <ChatRoot
      peer={{
        name: student.name,
        initials: student.initials,
        avatar: student.avatar,
        about: `${student.group}, заявка № ${number}`,
      }}
      messages={messages}
      compose={
        !isClosed(status)
          ? {
              label: "Сообщение студенту",
              placeholder: "Сообщение студенту",
              canAsk: status !== "need_info",
              onSend: (t, ask) => sendReply(id, t, ask),
            }
          : undefined
      }
      closedText="Заявка закрыта, переписка завершена."
    >
      {children}
    </ChatRoot>
  );
}

/**
 * Панель действий по статусу заявки. Вопрос студенту задаётся в переписке отметкой «Ответ на сообщение обязателен».
 * Сервер ещё раз проверяет роль и допустимый переход.
 */
/** ФИО студента для заявки на исправление данных: сотрудник правит прямо в окне «Заявка выполнена». */
function NameFields({ names }: { names: Names }) {
  const rows: [keyof Names, string][] = [
    ["last", "Фамилия"],
    ["first", "Имя"],
    ["middle", "Отчество"],
  ];
  return (
    <fieldset className="grid gap-2.5">
      <legend className="mb-1.5 text-[13px] font-bold">ФИО в профиле студента</legend>
      {rows.map(([key, label]) => (
        <div key={key} className="grid gap-1">
          <Label htmlFor={`name-${key}`} className="text-[13px] text-muted-foreground">
            {label}
          </Label>
          <Input id={`name-${key}`} name={key} defaultValue={names[key]} required={key !== "middle"} maxLength={40} autoComplete="off" className="text-base" />
        </div>
      ))}
    </fieldset>
  );
}

export function StaffActions({ id, status, type, format, names, chat }: { id: string; status: AppStatus; type: DocType; format: Format; names: Names; chat: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const certificate = isCertificate(type);

  // Закрытую заявку не изменить, но переписку можно перечитать
  if (isClosed(status))
    return (
      <div className="enter flex" style={stagger(1)}>
        {chat}
      </div>
    );

  const take = () =>
    start(async () => {
      const r = await withOffline(takeInWork(id));
      if (r.error) return void toast.error("Не получилось", { description: r.error });
      toast.success("Заявка в работе", {
        description: "Студент видит новый статус.",
      });
      router.refresh();
    });

  const refuse = (
    <TextAction
      trigger={
        <Button variant="ghost" className="flex-1 text-destructive hover:bg-destructive-soft hover:text-destructive">
          <X aria-hidden="true" />
          Отклонить
        </Button>
      }
      title="Отклонить заявку?"
      text="Студент увидит причину как комментарий деканата. Отменить отказ нельзя."
      label="Причина отказа"
      placeholder="Например: справка с этой целью выдаётся только в отделе кадров"
      submit="Отклонить"
      done="Заявка отклонена"
      required="Напишите причину отказа."
      onSubmit={(t) => reject(id, t)}
    />
  );

  const ready = (
    <TextAction
      trigger={
        <Button size="lg">
          <CircleCheck aria-hidden="true" />
          {certificate ? "Справка готова" : "Заявка выполнена"}
        </Button>
      }
      title={certificate ? "Выдать справку?" : "Отметить выполненной?"}
      text={
        certificate
          ? format === "electronic"
            ? "Студент сразу увидит справку с QR-кодом для проверки. Переписка закроется."
            : "Студент увидит, что справка готова, и копию с QR-кодом. Переписка закроется."
          : type === "data_fix"
            ? "Исправьте ФИО, если нужно. Студент сразу увидит новые данные в профиле. Переписка закроется."
            : "Студент увидит, что заявка выполнена, и ваш комментарий. Переписка закроется."
      }
      fields={type === "data_fix" ? <NameFields names={names} /> : undefined}
      label="Комментарий для студента, если нужен"
      placeholder={ISSUE_HINT[type]}
      submit={certificate ? "Выдать" : "Готово"}
      done={certificate ? "Справка выдана" : "Заявка выполнена"}
      onSubmit={(t, f) =>
        type === "data_fix" ? issue(id, t, { last: String(f.get("last")), first: String(f.get("first")), middle: String(f.get("middle") ?? "") }) : issue(id, t)
      }
    />
  );

  return (
    <section className="enter space-y-2.5" style={stagger(1)} aria-label="Действия с заявкой">
      {status === "submitted" ? (
        <Button size="lg" onClick={take} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}
          Взять в работу
        </Button>
      ) : status === "need_info" ? (
        <>
          <p className="rounded-xl bg-warning-soft px-3.5 py-3 text-sm font-semibold text-warning">Ждём ответа студента. Когда он придёт, заявка вернётся в работу.</p>
          {ready}
        </>
      ) : (
        ready
      )}
      <div className="flex gap-2">
        {chat}
        {refuse}
      </div>
    </section>
  );
}
