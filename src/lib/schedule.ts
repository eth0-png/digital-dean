import "server-only";
import { requireStudent } from "./auth";

// Расписание. Сетка по группам в коде (демо-данные, как сид), изменения считаются от текущей даты:
// жюри в любой день 22–28 ноября увидит пары «сегодня» и перенос у второго студента.
// Студент видит только расписание своей группы: группа берётся из сессии, не из адреса.
// Преподаватели вымышленные. Дисциплины по реалиям МГИМО (рабочий план, research/lks-mgimo-review.md).

const TZ = "Europe/Moscow";

/** Время пар: по 1 ч 20 мин, первая в 9:00, перемены по 10 минут. Меняется только здесь. */
export const SLOTS: [string, string][] = [
  ["09:00", "10:20"],
  ["10:30", "11:50"],
  ["12:00", "13:20"],
  ["13:30", "14:50"],
  ["15:00", "16:20"],
  ["16:30", "17:50"],
];

type Kind = "лекция" | "семинар" | "практика";
type Base = { slot: number; subject: string; kind: Kind; room: string; teacher: string };
type ChangeKind = "moved" | "cancelled" | "room";

export type Lesson = Omit<Base, "kind"> & {
  kind: string; // лекция, семинар, практика, а в сессию «экзамен», «зачёт»
  start: string;
  end: string;
  place: string; // «ауд. 1024» или «спортзал»
  change?: { kind: ChangeKind; from?: string; note?: string };
  state?: "past" | "now";
};
export type Day = { date: string; short: string; full: string; label: string; today: boolean; session: boolean; lessons: Lesson[] };

const place = (room: string) => (/^\d/.test(room) ? `ауд. ${room}` : room);
const L = (slot: number, subject: string, kind: Kind, room: string, teacher: string): Base => ({ slot, subject, kind, room, teacher });

// Неделя с понедельника. Суббота свободна.
const TIMETABLE: Record<string, Base[][]> = {
  "МП-31": [
    [L(1, "Международное право", "лекция", "1024", "Орлова Н. В."), L(2, "Международное право", "семинар", "3012", "Орлова Н. В."), L(3, "Иностранный язык в сфере юриспруденции", "практика", "4016", "Ершова А. Д.")],
    [L(1, "Гражданский процесс", "лекция", "1036", "Кравцов Д. А."), L(2, "Уголовный процесс", "лекция", "1036", "Миронова Е. П."), L(3, "Второй иностранный язык (испанский)", "практика", "4021", "Ткаченко В. Л.")],
    [L(2, "Финансовое право", "лекция", "1024", "Савельев А. Н."), L(3, "Финансовое право", "семинар", "2045", "Савельев А. Н."), L(4, "Физическая культура", "практика", "спортзал", "Зайцев М. Р.")],
    [L(1, "Европейское право", "лекция", "1036", "Лебедев К. С."), L(2, "Гражданское и торговое право зарубежных стран", "лекция", "1024", "Фомина О. Ю."), L(3, "Гражданский процесс", "семинар", "3008", "Кравцов Д. А."), L(4, "Иностранный язык в сфере юриспруденции", "практика", "4016", "Ершова А. Д.")],
    [L(1, "Криминология", "лекция", "1024", "Голубева Т. И."), L(2, "Уголовный процесс", "семинар", "3012", "Миронова Е. П."), L(3, "Второй иностранный язык (испанский)", "практика", "4021", "Ткаченко В. Л.")],
    [],
  ],
  "МИЭП-12": [
    [L(1, "Микроэкономика", "лекция", "1110", "Белоусов П. Г."), L(2, "Математический анализ", "лекция", "1110", "Соловьёва И. К."), L(3, "Английский язык", "практика", "4112", "Шевченко Л. Н.")],
    [L(2, "История России", "лекция", "1110", "Полякова Е. А."), L(3, "Микроэкономика", "семинар", "2104", "Белоусов П. Г."), L(4, "Линейная алгебра", "семинар", "2210", "Никитин Р. В.")],
    [L(1, "Введение в мировую энергетику", "лекция", "1110", "Гаврилов С. М."), L(2, "Математический анализ", "семинар", "2210", "Соловьёва И. К."), L(3, "Физическая культура", "практика", "спортзал", "Зайцев М. Р.")],
    [L(1, "Философия", "лекция", "1110", "Тарасова М. О."), L(2, "Микроэкономика", "семинар", "2104", "Белоусов П. Г."), L(3, "Английский язык", "практика", "4112", "Шевченко Л. Н.")],
    [L(1, "Линейная алгебра", "лекция", "1110", "Никитин Р. В."), L(2, "История России", "семинар", "3105", "Полякова Е. А."), L(3, "Введение в мировую энергетику", "семинар", "2104", "Гаврилов С. М.")],
    [],
  ],
};

/**
 * Сессия: зачёты и экзамены по группам. На эти недели вместо обычных пар показываем их (с первого зачёта по последний экзамен).
 * Отсюда же список «Сессия» в «Учёбе». Даты фиксированные, только будни и суббота.
 */
export type SessionItem = { subject: string; control: "экзамен" | "зачёт"; date: string; extra?: string };
export const SESSION: Record<string, SessionItem[]> = {
  "МП-31": [
    { subject: "Международное право", control: "зачёт", date: "2026-12-22" },
    { subject: "Гражданское и торговое право зарубежных стран", control: "зачёт", date: "2026-12-23" },
    { subject: "Криминология", control: "зачёт", date: "2026-12-24" },
    { subject: "Иностранный язык в сфере юриспруденции", control: "зачёт", date: "2026-12-25" },
    { subject: "Финансовое право", control: "экзамен", date: "2027-01-12" },
    { subject: "Гражданский процесс", control: "экзамен", date: "2027-01-16" },
    { subject: "Уголовный процесс", control: "экзамен", date: "2027-01-20" },
    { subject: "Европейское право", control: "экзамен", date: "2027-01-25", extra: "и курсовая работа" },
  ],
  "МИЭП-12": [
    { subject: "Английский язык", control: "зачёт", date: "2026-12-22" },
    { subject: "Философия", control: "зачёт", date: "2026-12-23" },
    { subject: "Введение в мировую энергетику", control: "зачёт", date: "2026-12-25" },
    { subject: "Микроэкономика", control: "экзамен", date: "2027-01-13" },
    { subject: "Математический анализ", control: "экзамен", date: "2027-01-18" },
    { subject: "Линейная алгебра", control: "экзамен", date: "2027-01-21" },
    { subject: "История России", control: "экзамен", date: "2027-01-25" },
  ],
};

const inSession = (group: string, date: string) => {
  const s = SESSION[group];
  return Boolean(s?.length) && date >= s[0].date && date <= s.at(-1)!.date;
};

/** День сессии: зачёты и экзамены этого дня. Аудитория и преподаватель как у лекции по предмету. */
function sessionDay(group: string, date: string): Lesson[] {
  const all = TIMETABLE[group]?.flat() ?? [];
  return (SESSION[group] ?? [])
    .filter((x) => x.date === date)
    .map((x) => {
      const base = all.find((l) => l.subject === x.subject && l.kind === "лекция") ?? all.find((l) => l.subject === x.subject);
      const room = base?.room ?? "1024";
      return {
        slot: 1,
        subject: x.subject,
        kind: x.extra ? `${x.control} ${x.extra}` : x.control,
        room,
        place: place(room),
        teacher: base?.teacher ?? "",
        start: "10:00",
        end: x.control === "экзамен" ? "13:00" : "11:30",
      };
    });
}

/**
 * Изменения от ближайшего учебного дня (day 0 — сегодня или следующий учебный день).
 * lesson: какая пара дня по порядку. Перенос ставит пару сразу после последней.
 */
const RULES: { group: string; day: 0 | 1; lesson: number | "last"; kind: ChangeKind; room?: string; note?: string }[] = [
  { group: "МИЭП-12", day: 0, lesson: 1, kind: "moved", note: "Преподаватель на заседании кафедры" },
  { group: "МИЭП-12", day: 1, lesson: "last", kind: "cancelled", note: "Преподаватель на конференции" },
  { group: "МП-31", day: 1, lesson: 0, kind: "room", room: "3017" },
];

const SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const ON_DAY = ["в понедельник", "во вторник", "в среду", "в четверг", "в пятницу", "в субботу", "в воскресенье"];

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const hm = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
const dayMonthShort = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

/** Текущий момент. DEMO_NOW (например 2026-11-10T10:45:00+03:00) только для проверки локально, на сервере не задаётся. */
export const now = () => (process.env.DEMO_NOW ? new Date(process.env.DEMO_NOW) : new Date());
export const moscow = (d: Date) => {
  const [h, m] = hm.format(d).split(":").map(Number);
  return { date: ymd.format(d), min: h * 60 + m };
};
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const weekday = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 — понедельник
export const dayLabel = (date: string) => dayMonth.format(new Date(`${date}T00:00:00Z`));
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && addDays(s, 0) === s;

const baseDay = (group: string, date: string) => [...(TIMETABLE[group]?.[weekday(date)] ?? [])].sort((a, b) => a.slot - b.slot);

function studyDays(group: string, from: string, count: number) {
  const days: string[] = [];
  for (let i = 0; i < 14 && days.length < count; i++) {
    const d = addDays(from, i);
    if (baseDay(group, d).length) days.push(d);
  }
  return days;
}

type Change = { key: string; date: string; slot: number; toSlot?: number; kind: ChangeKind; room?: string; oldRoom: string; note?: string; subject: string; announced: Date };

function changes(group: string, today: string): Change[] {
  const days = studyDays(group, today, 2);
  // Объявили накануне ближайшего учебного дня в 18:00, но не позже вчерашнего вечера: время в ленте не «из будущего»
  let announced = new Date(`${addDays(days[0] ?? today, -1)}T18:00:00+03:00`);
  if (announced > now()) announced = new Date(`${addDays(today, -1)}T18:00:00+03:00`);
  return RULES.filter((r) => r.group === group).flatMap((r) => {
    const date = days[r.day];
    if (!date) return [];
    const lessons = baseDay(group, date);
    const l = r.lesson === "last" ? lessons.at(-1) : lessons[r.lesson];
    if (!l) return [];
    const toSlot = r.kind === "moved" ? Math.min(lessons.at(-1)!.slot + 1, SLOTS.length) : undefined;
    return [{ key: `schedule:${group}:${date}:${l.slot}`, date, slot: l.slot, toSlot, kind: r.kind, room: r.room, oldRoom: l.room, note: r.note, subject: l.subject, announced }];
  });
}

function applyDay(group: string, date: string, chs: Change[], nowMin?: number): Lesson[] {
  const list = inSession(group, date)
    ? sessionDay(group, date)
    : baseDay(group, date)
    .map((l): Lesson => {
      const c = chs.find((c) => c.date === date && c.slot === l.slot);
      const slot = c?.toSlot ?? l.slot;
      const room = c?.room ?? l.room;
      const lesson: Lesson = { ...l, slot, start: SLOTS[slot - 1][0], end: SLOTS[slot - 1][1], room, place: place(room) };
      if (c) lesson.change = { kind: c.kind, from: c.kind === "moved" ? SLOTS[l.slot - 1][0] : c.kind === "room" ? place(l.room) : undefined, note: c.note };
      return lesson;
    })
    .sort((a, b) => a.slot - b.slot);
  if (nowMin !== undefined) {
    for (const l of list) l.state = nowMin >= toMin(l.end) ? "past" : nowMin >= toMin(l.start) ? "now" : undefined;
  }
  return list;
}

/** Неделя (пн–сб) с выбранной датой. Без даты: текущая, а в воскресенье следующая. */
export async function getWeek(date?: unknown) {
  const user = await requireStudent();
  const group = user.groupName ?? "";
  const { date: today, min } = moscow(now());
  const target = isDate(date) ? date : weekday(today) === 6 ? addDays(today, 1) : today;
  const monday = addDays(target, -weekday(target));
  const chs = changes(group, today);
  const days: Day[] = SHORT.slice(0, 6).map((short, i) => {
    const d = addDays(monday, i);
    return { date: d, short, full: FULL[i], label: dayLabel(d), today: d === today, session: inSession(group, d), lessons: applyDay(group, d, chs, d === today ? min : undefined) };
  });
  const sat = addDays(monday, 5);
  // Подпись недели в одну строку на 360 px: «9–14 ноября». Если неделя на стыке месяцев или другого года (тогда в конце год),
  // месяцы коротко: «30 нояб. – 5 дек.», «28 дек. – 2 янв. 2027», «11–16 янв. 2027»
  const otherYear = monday.slice(0, 4) !== today.slice(0, 4) || sat.slice(0, 4) !== today.slice(0, 4);
  const sameMonth = monday.slice(0, 7) === sat.slice(0, 7);
  const fmt = (d: string) => (otherYear || !sameMonth ? dayMonthShort : dayMonth).format(new Date(`${d}T00:00:00Z`));
  const days2 = sameMonth ? `${Number(monday.slice(8))}–${fmt(sat)}` : `${fmt(monday)} – ${fmt(sat)}`;
  const range = otherYear ? `${days2} ${sat.slice(0, 4)}` : days2;
  const current = addDays(today, -weekday(today) + (weekday(today) === 6 ? 7 : 0));
  return {
    days,
    range,
    selected: Math.min(weekday(target), 5),
    monday,
    prev: addDays(monday, -7),
    next: addDays(monday, 7),
    relation:
      monday === current
        ? "эта неделя"
        : monday === addDays(current, 7)
          ? "следующая неделя"
          : monday === addDays(current, -7)
            ? "прошлая неделя"
            : days.some((d) => d.session)
              ? "сессия"
              : "",
    isCurrent: monday === current,
  };
}

const plural = (n: number, one: string, few: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

function inMinutes(diff: number) {
  if (diff < 60) return `Через ${diff} ${plural(diff, "минуту", "минуты", "минут")}`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `Через ${h} ч${m ? ` ${m} мин` : ""}`;
}

/** Для «Сегодня»: ближайшая пара (идёт или следующая), пары дня, изменения на ближайшие учебные дни. */
export async function getToday() {
  const user = await requireStudent();
  const group = user.groupName ?? "";
  const { date: today, min } = moscow(now());
  const chs = changes(group, today);
  const lessons = applyDay(group, today, chs, min);
  const live = (l: Lesson) => l.change?.kind !== "cancelled";

  let next = lessons.find((l) => live(l) && l.state === "now") ?? lessons.find((l) => live(l) && !l.state);
  let when = "";
  let nextDate = today;
  if (next) {
    when = next.state === "now" ? `Закончится в ${next.end}` : inMinutes(toMin(next.start) - min);
  } else {
    nextDate = studyDays(group, addDays(today, 1), 1)[0] ?? "";
    next = nextDate ? applyDay(group, nextDate, chs).find(live) : undefined;
    if (next) when = nextDate === addDays(today, 1) ? "Завтра" : ON_DAY[weekday(nextDate)].replace(/^в/, "В");
  }
  const nextDay = nextDate && nextDate !== today ? { date: nextDate, label: `${nextDate === addDays(today, 1) ? "завтра" : ON_DAY[weekday(nextDate)]}, ${dayLabel(nextDate)}`, count: applyDay(group, nextDate, chs).filter(live).length } : null;
  return { today, dateText: fullDate.format(now()), lessons, next, when, nextDay, changes: changeNotices(chs) };
}

export type ScheduleNotice = { key: string; kind: ChangeKind; title: string; text: string; href: string; at: Date };

function changeNotices(chs: Change[]): ScheduleNotice[] {
  return chs.map((c) => {
    const day = `${SHORT[weekday(c.date)].toLowerCase()} ${dayLabel(c.date)}`;
    const text =
      c.kind === "moved"
        ? `${c.subject}, ${day}: в ${SLOTS[c.toSlot! - 1][0]} вместо ${SLOTS[c.slot - 1][0]}`
        : c.kind === "cancelled"
          ? `${c.subject}, ${day}: пары не будет`
          : `${c.subject}, ${day}: ауд. ${c.room} вместо ${c.oldRoom}`;
    const title = c.kind === "moved" ? "Пару перенесли" : c.kind === "cancelled" ? "Пару отменили" : "Пара в другой аудитории";
    return { key: c.key, kind: c.kind, title, text: c.note ? `${text}. ${c.note}` : text, href: `/schedule?date=${c.date}`, at: c.announced };
  });
}

/** Изменения расписания группы для ленты уведомлений. Вызывать после requireStudent: группа из сессии. */
export function scheduleNotices(group: string) {
  return changeNotices(changes(group, moscow(now()).date));
}
