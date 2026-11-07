import type { Metadata } from "next";
import { CircleCheck, SearchX } from "lucide-react";
import { findByVerifyCode } from "@/lib/applications";
import { DOC_TYPES } from "@/lib/documents";
import { Logo, CONCEPT_NOTE } from "@/components/logo";
import { Reveal } from "@/components/kit";

// Открытая страница проверки по QR. Без входа, поэтому только минимум: тип, номер, дата, имя с инициалами.

export const metadata: Metadata = { title: "Проверка документа", robots: { index: false, follow: false } };

export default function VerifyPage({ params }: PageProps<"/verify/[code]">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-6 pb-6">
      <div className="flex items-center gap-2.5">
        <Logo />
        <span className="font-display text-base font-semibold">деканат</span>
      </div>
      <h1 className="mt-6 font-display text-[22px] font-semibold">Проверка документа</h1>
      <div className="mt-5 flex-1">
        <Reveal>
          <Result params={params} />
        </Reveal>
      </div>
      <p className="pt-8 text-center text-xs text-muted-foreground">{CONCEPT_NOTE}</p>
    </main>
  );
}

async function Result({ params }: { params: Promise<{ code: string }> }) {
  const doc = await findByVerifyCode((await params).code);

  if (!doc)
    return (
      <div className="enter rounded-2xl bg-destructive-soft p-5">
        <SearchX size={32} className="text-destructive" aria-hidden="true" />
        <p className="mt-3 text-lg font-bold">Документ не найден</p>
        <p className="mt-1 text-muted-foreground">Проверьте ссылку или обратитесь в деканат.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="enter rounded-2xl bg-success-soft p-5">
        <CircleCheck size={32} className="text-success" aria-hidden="true" />
        <p className="mt-3 text-lg font-bold text-success">Документ действителен</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[15px]">
          <dt className="text-muted-foreground">Документ</dt>
          <dd className="font-semibold">
            {DOC_TYPES[doc.type].title} № {doc.number}
          </dd>
          <dt className="text-muted-foreground">Выдан</dt>
          <dd className="font-semibold">{doc.issued}</dd>
          <dt className="text-muted-foreground">Кому</dt>
          <dd className="font-semibold">{doc.holder}</dd>
        </dl>
      </div>
      <p className="enter rounded-xl border-2 border-destructive px-4 py-3 text-center font-extrabold text-destructive">Демо, юридической силы не имеет</p>
    </div>
  );
}
