"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/avatar";
import { withOffline } from "@/components/kit";
import { AVATARS, type AvatarKey } from "@/lib/avatars";
import { setAvatar } from "@/app/avatar-actions";

/**
 * Выбор аватарки из набора значков. Нажали на значок, аватарка сохранилась, окно закрылось.
 * trigger: кнопка, которая открывает окно (кружок с аватаркой в профиле или в шапке сотрудника).
 */
export function AvatarPicker({ current, initials, trigger }: { current: string | null; initials: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const options: [AvatarKey | null, string][] = [[null, "Инициалы"], ...(Object.entries(AVATARS) as [AvatarKey, string][])];

  function choose(key: AvatarKey | null) {
    start(async () => {
      const { error } = await withOffline(setAvatar(key));
      if (error) return void toast.error("Не получилось", { description: error });
      setOpen(false);
      toast.success("Аватарка обновлена");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="font-display text-[17px] font-semibold">Аватарка</DialogTitle>
          <DialogDescription className="text-[14px]">Выберите значок. Фото не загружаем: в прототипе только вымышленные данные.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Аватарка" className="grid grid-cols-4 gap-2">
          {options.map(([key, label]) => {
            const selected = (current ?? null) === key;
            return (
              <button
                key={key ?? "initials"}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                disabled={pending}
                onClick={() => choose(key)}
                className={`press grid place-items-center justify-self-center rounded-full p-1.5 transition-shadow ${selected ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-secondary"}`}
              >
                <UserAvatar avatar={key} initials={initials} size="size-14" icon={26} />
              </button>
            );
          })}
        </div>
        <DialogClose asChild>
          <Button variant="secondary">Готово</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
