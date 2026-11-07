import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { DOC_TYPES, isDocType } from "@/lib/documents";
import { PageTransition, Reveal } from "@/components/kit";
import { BackLink } from "@/components/nav-trail";
import { OrderForm } from "@/components/documents/documents-client";

export const metadata: Metadata = { title: "Оформление" };

export default function NewApplicationPage({ searchParams }: PageProps<"/documents/new">) {
  return (
    <PageTransition>
      <Reveal>
        <NewApplication searchParams={searchParams} />
      </Reveal>
    </PageTransition>
  );
}

async function NewApplication({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStudent();
  const type = (await searchParams).type;
  if (!isDocType(type)) notFound();
  const cfg = DOC_TYPES[type];

  return (
    <div className="lg:max-w-xl">
      <BackLink fallbackHref="/documents" fallbackLabel="Документы" />
      <h1 className="enter mt-3 font-display text-[22px] leading-tight font-semibold">{cfg.title}</h1>
      <p className="enter mt-1.5 mb-6 text-muted-foreground">{cfg.about}</p>
      <OrderForm
        type={type}
        student={{ fio: `${user.lastName} ${user.firstName} ${user.middleName ?? ""}`.trim(), course: user.course ?? 1, group: user.groupName ?? "" }}
      />
    </div>
  );
}
