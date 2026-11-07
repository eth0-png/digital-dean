import { FileText, PencilLine, RotateCcw, ShieldCheck, type LucideIcon } from "lucide-react";

// Тексты из docs/design/documents-copy.md (скилл design:ux-copy)

export type AppStatus = "submitted" | "in_progress" | "need_info" | "ready" | "rejected";

export const STATUS: Record<AppStatus, { title: string; sub: string; badge: "info" | "success" | "warning" | "danger"; step: number }> = {
  submitted: { title: "Заявка принята", sub: "Деканат получил заявку", badge: "info", step: 0 },
  in_progress: { title: "В работе", sub: "Сотрудник готовит документ", badge: "info", step: 1 },
  need_info: { title: "Нужно уточнение", sub: "Ответьте, и документ продолжат готовить", badge: "warning", step: 1 },
  ready: { title: "Готово", sub: "Документ готов, электронная версия ниже", badge: "success", step: 2 },
  rejected: { title: "Отклонено", sub: "Причина указана в истории", badge: "danger", step: 1 },
};

export const STEPS = ["Принята", "В работе", "Готово"] as const;

export type DocType = "study" | "military" | "retake" | "data_fix";

export const DOC_TYPES: Record<DocType, { title: string; short: string; hint: string; icon: LucideIcon; days: number }> = {
  study: { title: "Справка об обучении", short: "Справка об обучении", hint: "С QR-кодом, обычно 1 день", icon: FileText, days: 1 },
  military: { title: "Справка для военкомата", short: "Для военкомата", hint: "2 рабочих дня", icon: ShieldCheck, days: 2 },
  retake: { title: "Заявление на пересдачу", short: "Пересдача", hint: "Заявление", icon: RotateCcw, days: 3 },
  data_fix: { title: "Исправление личных данных", short: "Нашли ошибку в данных", hint: "Исправим в профиле", icon: PencilLine, days: 2 },
};

export const PURPOSES = ["На работу", "В военкомат", "В соцзащиту", "Для визы", "Другое"];

export type AppEvent = {
  at: string;
  kind: "submitted" | "in_progress" | "question" | "answer" | "message" | "ready" | "rejected";
  text?: string;
};

export type Application = {
  id: string;
  number: number;
  type: DocType;
  purpose: string;
  format: "electronic" | "paper";
  status: AppStatus;
  due: string;
  readyAt?: string;
  question?: string;
  verifyCode?: string;
  events: AppEvent[];
};

export const EVENT_TITLE: Record<AppEvent["kind"], string> = {
  submitted: "Заявка принята",
  in_progress: "В работе",
  question: "Деканат задал вопрос",
  answer: "Вы ответили",
  message: "Вы написали в деканат",
  ready: "Готово",
  rejected: "Отклонено",
};

/** Контакты деканата факультета (вымышленные) */
export const DEAN_OFFICE = {
  person: "Марина Ковалёва",
  initials: "МК",
  role: "Специалист деканата МП",
  phone: "+7 (495) 000-00-00",
  room: "Каб. 2105",
  hours: "пн–пт 10:00–17:00",
};
