import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { listMyNotices } from "@/lib/notifications";
import { EmptyState, PageTransition, Reveal } from "@/components/kit";
import { NoticeList } from "@/components/notices";

export const metadata: Metadata = { title: "Уведомления" };

export default function NotificationsPage() {
  return (
    <PageTransition>
      <Reveal>
        <Notifications />
      </Reveal>
    </PageTransition>
  );
}

async function Notifications() {
  const notices = await listMyNotices();
  return (
    <div className="space-y-4 lg:max-w-2xl">
      <h1 className="enter font-display text-[22px] font-semibold">Уведомления</h1>
      {notices.length > 0 ? (
        <NoticeList notices={notices} />
      ) : (
        <EmptyState icon={<Bell size={24} aria-hidden="true" />} title="Уведомлений пока нет" text="Здесь появятся ответы деканата и новости по вашим заявкам." />
      )}
    </div>
  );
}
