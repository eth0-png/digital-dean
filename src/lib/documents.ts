import { FileText, PencilLine, RotateCcw, ShieldCheck, type LucideIcon } from "lucide-react";

// Типы и тексты раздела «Документы». Тексты из docs/design/documents-copy.md (скилл design:ux-copy).

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
export type Format = "electronic" | "paper";

type DocConfig = {
  title: string;
  short: string;
  hint: string;
  about: string;
  icon: LucideIcon;
  days: number;
  purpose: boolean; // спрашивать, куда нужна справка
  formats: Format[]; // пусто: формат не важен (заявления)
  details?: { label: string; placeholder: string; error: string };
};

export const DOC_TYPES: Record<DocType, DocConfig> = {
  study: {
    title: "Справка об обучении",
    short: "Справка об обучении",
    hint: "С QR-кодом, обычно 1 день",
    about: "Подтверждает, что вы учитесь. Обычно готовят за 1 рабочий день.",
    icon: FileText,
    days: 1,
    purpose: true,
    formats: ["electronic", "paper"],
  },
  military: {
    title: "Справка для военкомата",
    short: "Для военкомата",
    hint: "2 рабочих дня",
    about: "Для воинского учёта. Бумажная, с печатью, готовят за 2 рабочих дня.",
    icon: ShieldCheck,
    days: 2,
    purpose: false,
    formats: ["paper"],
  },
  retake: {
    title: "Заявление на пересдачу",
    short: "Пересдача",
    hint: "Заявление",
    about: "Деканат согласует дату с преподавателем и пришлёт ответ.",
    icon: RotateCcw,
    days: 3,
    purpose: false,
    formats: [],
    details: { label: "Дисциплина и удобные даты", placeholder: "Например: макроэкономика, удобно 18 или 20 ноября", error: "Напишите дисциплину и удобные даты." },
  },
  data_fix: {
    title: "Исправление личных данных",
    short: "Нашли ошибку в данных",
    hint: "Исправим в профиле",
    about: "Деканат проверит и исправит данные в профиле.",
    icon: PencilLine,
    days: 2,
    purpose: false,
    formats: [],
    details: { label: "Что нужно исправить", placeholder: "Например: в отчестве опечатка, правильно Дмитриевна", error: "Опишите, что нужно исправить." },
  },
};

export const isDocType = (t: unknown): t is DocType => typeof t === "string" && t in DOC_TYPES;

export const PURPOSES = ["На работу", "В военкомат", "В соцзащиту", "Для визы", "Другое"];

export type AppEvent = {
  at: string;
  kind: "submitted" | "in_progress" | "question" | "answer" | "message" | "ready" | "rejected";
  text?: string;
  read?: boolean;
};

export type Application = {
  id: string;
  number: number;
  type: DocType;
  purpose: string;
  format: Format;
  status: AppStatus;
  due: string;
  readyAt?: string;
  question?: string;
  verifyCode?: string;
  details?: string;
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

/** Контакты деканата (вымышленные) */
export const DEAN_OFFICE = {
  person: "Марина Ковалёва",
  initials: "МК",
  role: "Специалист деканата",
  phone: "+7 (495) 000-00-00",
  room: "Каб. 2105",
  hours: "пн–пт 10:00–17:00",
};

export const plural = (n: number, one: string, few: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

export type ChatMessage = { id: string; from: "dean" | "me" | "system"; text: string; at: string; read?: string };

/** События заявки в сообщения переписки: вопросы и ответы пузырями, этапы системными строками. */
export function toChat(app: Application): ChatMessage[] {
  return app.events.map((e, i) => ({
    id: String(i),
    from: e.kind === "question" ? "dean" : e.kind === "answer" || e.kind === "message" ? "me" : "system",
    text: e.text ?? EVENT_TITLE[e.kind],
    at: e.at,
    read: e.kind === "answer" ? (e.read ? "прочитано" : "доставлено") : undefined,
  }));
}
