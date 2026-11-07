"use client";

import { ErrorView } from "@/components/error-view";

// Ошибка вне кабинета (вход, проверка по QR): на весь экран, с плашкой «концепт»
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorView retry={retry} full />;
}
