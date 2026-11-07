"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CircleCheck, LoaderCircle, MessageCircleQuestion, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stagger } from "@/components/kit";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { AppStatus, DocType, Format } from "@/lib/documents";
import { askQuestion, issue, markRead, reject, takeInWork } from "@/app/staff/actions";

type Result = { error?: string };

/** Действие с текстом в окне: вопрос студенту, отказ с причиной, комментарий к готовому документу. */
function TextAction({
  trigger,
  title,
  text,
  label,
  placeholder,
  submit,
  done,
  required,
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
  onSubmit: (text: string) => Promise<Result>;
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
    start(async () => {
      const r = await onSubmit(value);
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
      <DialogContent showCloseButton={false} className="gap-0 p-0">
        <form onSubmit={send} className="grid gap-4 p-4">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-[14px]">{text}</DialogDescription>
          </DialogHeader>
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
              aria-invalid={Boolean(error)}
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
  data_fix: "Например: исправили группу в профиле",
};

/** Панель действий по статусу заявки. Сервер ещё раз проверяет роль и допустимый переход. */
export function StaffActions({ id, status, type, format }: { id: string; status: AppStatus; type: DocType; format: Format }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const certificate = type === "study" || type === "military";

  if (status === "ready" || status === "rejected") return null;

  const take = () =>
    start(async () => {
      const r = await takeInWork(id);
      if (r.error) return void toast.error("Не получилось", { description: r.error });
      toast.success("Заявка в работе", { description: "Студент видит новый статус." });
      router.refresh();
    });

  const ask = (
    <TextAction
      trigger={
        <Button variant="secondary" className="flex-1">
          <MessageCircleQuestion aria-hidden="true" />
          Задать вопрос
        </Button>
      }
      title="Вопрос студенту"
      text="Заявка встанет на паузу, пока студент не ответит. Ответ придёт сюда."
      label="Вопрос"
      placeholder="Например: справка нужна с отметкой о форме обучения?"
      submit="Отправить"
      done="Вопрос отправлен"
      required="Напишите вопрос студенту."
      onSubmit={(t) => askQuestion(id, t)}
    />
  );

  const refuse = (
    <TextAction
      trigger={
        <Button variant="ghost" className="flex-1 text-destructive hover:bg-destructive-soft hover:text-destructive">
          <X aria-hidden="true" />
          Отклонить
        </Button>
      }
      title="Отклонить заявку?"
      text="Студент увидит причину в истории заявки. Отменить отказ нельзя."
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
            ? "Студент сразу увидит справку с QR-кодом для проверки."
            : "Студент увидит, что справка готова, и копию с QR-кодом."
          : "Студент увидит, что заявка выполнена, и ваш комментарий."
      }
      label="Комментарий для студента, если нужен"
      placeholder={ISSUE_HINT[type]}
      submit={certificate ? "Выдать" : "Готово"}
      done={certificate ? "Справка выдана" : "Заявка выполнена"}
      onSubmit={(t) => issue(id, t)}
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
        {status !== "need_info" && ask}
        {refuse}
      </div>
    </section>
  );
}

/** Сотрудник открыл заявку: ответы студента прочитаны. В эффекте, чтобы предзагрузка страницы их не отмечала. */
export function MarkRead({ id }: { id: string }) {
  useEffect(() => {
    markRead(id);
  }, [id]);
  return null;
}
