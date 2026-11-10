import { FileText, PencilLine, RotateCcw, ShieldCheck, type LucideIcon } from "lucide-react";

// Типы и тексты раздела «Документы». Тексты из docs/design/documents-copy.md (скилл design:ux-copy).

export type AppStatus = "submitted" | "in_progress" | "need_info" | "ready" | "rejected" | "cancelled";

/** Закрытая заявка: документ выдан, деканат отказал или студент отменил. Переписка по ней закрыта. */
export const isClosed = (s: AppStatus) => s === "ready" || s === "rejected" || s === "cancelled";

export const STATUS: Record<AppStatus, { title: string; sub: string; badge: "info" | "success" | "warning" | "danger" | "secondary"; step: number }> = {
  submitted: { title: "Заявка принята", sub: "Деканат получил заявку", badge: "info", step: 0 },
  in_progress: { title: "В работе", sub: "Сотрудник готовит документ", badge: "info", step: 1 },
  need_info: { title: "Нужно уточнение", sub: "Ответьте, и документ продолжат готовить", badge: "warning", step: 1 },
  ready: { title: "Готово", sub: "Документ готов, электронная версия ниже", badge: "success", step: 2 },
  rejected: { title: "Отклонено", sub: "Причину деканат написал в истории ниже", badge: "danger", step: 1 },
  cancelled: { title: "Отменена", sub: "Заявку отменили, деканат её не готовит", badge: "secondary", step: 1 },
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
    details: { label: "Дисциплина и удобные даты", placeholder: "Например: макроэкономика, удобно в среду или пятницу", error: "Напишите дисциплину и удобные даты." },
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

/** Справка выдаётся документом с QR. Заявления (пересдача, исправление данных) просто выполняются. */
export const isCertificate = (t: DocType) => t === "study" || t === "military";

export const PURPOSES = ["На работу", "В военкомат", "В соцзащиту", "Для визы", "Другое"];

export type AppEvent = {
  at: string;
  kind: "submitted" | "in_progress" | "question" | "answer" | "message" | "reply" | "ready" | "rejected" | "cancelled";
  text?: string;
  read?: boolean; // уведомление просмотрено
  seen?: boolean; // сообщение прочитано в переписке
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
  closedAt?: string; // когда отклонили или отменили
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
  reply: "Деканат ответил",
  ready: "Готово",
  rejected: "Отклонено",
  cancelled: "Заявка отменена",
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

export type ChatMessage = { id: string; from: "me" | "them" | "system"; text: string; at: string; read?: string; fresh?: boolean };
export type Viewer = "student" | "staff";

/** Переписка: вопросы и сообщения деканата, ответы студента. Остальные события истории в переписку не входят. */
export const TALK: AppEvent["kind"][] = ["question", "reply", "answer", "message"];
export const fromStudent = (k: AppEvent["kind"]) => k === "answer" || k === "message";

const CHAT_STATUS: Partial<Record<AppEvent["kind"], string>> = {
  submitted: "Заявка принята",
  in_progress: "Заявка в работе",
  rejected: "Заявка отклонена",
  cancelled: "Заявка отменена",
};

/**
 * События заявки в переписку с точки зрения того, кто смотрит: свои сообщения справа, чужие слева,
 * этапы строками по центру. Комментарий деканата к готовой или отклонённой заявке идёт сообщением, под ним строка статуса.
 */
export function toChat(app: Application, viewer: Viewer): ChatMessage[] {
  const out: ChatMessage[] = [];
  const mineFrom = (k: AppEvent["kind"]) => (viewer === "student" ? fromStudent(k) : !fromStudent(k));
  const receipt = (e: AppEvent) => (mineFrom(e.kind) ? (e.seen ? "прочитано" : "доставлено") : undefined);
  const fresh = (e: AppEvent) => (!mineFrom(e.kind) && !e.seen) || undefined;
  app.events.forEach((e, i) => {
    if (TALK.includes(e.kind)) {
      out.push({ id: String(i), from: mineFrom(e.kind) ? "me" : "them", text: e.text ?? "", at: e.at, read: receipt(e), fresh: fresh(e) });
      return;
    }
    if (e.text) out.push({ id: `${i}-text`, from: viewer === "staff" ? "me" : "them", text: e.text, at: e.at, read: receipt(e), fresh: fresh(e) });
    const title = e.kind === "ready" ? (isCertificate(app.type) ? "Справка готова" : "Заявка выполнена") : CHAT_STATUS[e.kind];
    if (title) out.push({ id: String(i), from: "system", text: title, at: e.at });
  });
  return out;
}
