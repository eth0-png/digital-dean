"use client";

import { ErrorView } from "@/components/error-view";

// Ошибка на странице кабинета: шапка и меню остаются, можно уйти в другой раздел или повторить
export default function StudentError({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorView retry={retry} />;
}
