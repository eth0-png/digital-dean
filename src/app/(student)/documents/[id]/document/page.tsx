import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMyApplication, siteOrigin } from "@/lib/applications";
import { DOC_TYPES } from "@/lib/documents";
import { BackLink, PageTransition, Reveal } from "@/components/kit";
import { DocumentPaper } from "@/components/documents/documents-ui";
import { ShareButton } from "@/components/documents/documents-client";

export const metadata: Metadata = { title: "Справка" };

export default function DocumentPage({ params }: PageProps<"/documents/[id]/document">) {
  return (
    <PageTransition>
      <Reveal>
        <DocumentView params={params} />
      </Reveal>
    </PageTransition>
  );
}

async function DocumentView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { app, user } = await getMyApplication(id);
  if (app.status !== "ready" || !app.verifyCode) notFound();
  const verifyUrl = `${await siteOrigin()}/verify/${app.verifyCode}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackLink href={`/documents/${app.id}`}>Заявка № {app.number}</BackLink>
        <ShareButton title={`${DOC_TYPES[app.type].title} № ${app.number}`} url={verifyUrl} />
      </div>
      <DocumentPaper app={app} fio={`${user.lastName} ${user.firstName} ${user.middleName ?? ""}`.trim()} course={user.course ?? 1} faculty={user.faculty ?? ""} verifyUrl={verifyUrl} />
    </div>
  );
}
