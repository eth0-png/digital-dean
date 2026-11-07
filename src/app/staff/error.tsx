"use client";

import { ErrorView } from "@/components/error-view";

// Ошибка в кабинете сотрудника: шапка с выходом остаётся
export default function StaffError({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorView retry={retry} />;
}
