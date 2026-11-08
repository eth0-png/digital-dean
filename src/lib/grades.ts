import "server-only";
import { requireStudent } from "./auth";
import { addDays, dayLabel, moscow, now, weekday } from "./schedule";

// Успеваемость по реалиям МГИМО (research/lks-mgimo-review.md): стобалльная шкала с буквой и словом,
// семестры, экзамены и зачёты отдельно, текущая аттестация, рейтинг за семестр.
// Демо-данные в коде, как расписание. Баллы вымышленные. Даты оценок и сроков считаются от текущей даты.
// Студент видит только свою группу: группа и курс из сессии.

type Control = "экзамен" | "зачёт";
type Item = { subject: string; control: Control; score: number; extra?: string };
type Mid = { subject: string; work: string; score: number; daysAgo: number; retakeIn?: number };
type Exam = { subject: string; control: Control; date: string; extra?: string };
type GroupRecord = { past: { exams: Item[]; credits: Item[] }[]; mid: Mid[]; session: Exam[]; deadline?: { title: string; text: string; inDays: number } };

const E = (subject: string, score: number, extra?: string): Item => ({ subject, control: "экзамен", score, extra });
const Z = (subject: string, score: number): Item => ({ subject, control: "зачёт", score });

const RECORDS: { [group: string]: GroupRecord } = {
  "МП-31": {
    past: [
      {
        exams: [E("Философия", 91), E("Римское право", 88), E("История государства и права России", 94)],
        credits: [Z("Мировая экономика и международные экономические отношения", 86), Z("Русский язык и культура речи", 92), Z("Основы российской государственности", 90)],
      },
      {
        exams: [E("Теория государства и права", 93), E("Иностранный язык (английский)", 96), E("История России", 89)],
        credits: [Z("Логика", 88), Z("Информационные технологии в юридической деятельности", 91), Z("Физическая культура", 78)],
      },
      {
        exams: [E("Конституционное право России", 95), E("Гражданское право", 85), E("Иностранный язык (английский)", 94)],
        credits: [Z("Правовые системы современности", 92), Z("Административное право", 87)],
      },
      {
        exams: [E("Административное право зарубежных стран", 92), E("Гражданское право", 96), E("Второй иностранный язык (испанский)", 90), E("Конституционное право зарубежных стран", 97), E("Уголовное право", 93)],
        credits: [Z("Административный процесс", 89), Z("Физическая культура", 84)],
      },
    ],
    mid: [
      { subject: "Финансовое право", work: "контрольная работа", score: 92, daysAgo: 1 },
      { subject: "Международное право", work: "доклад на семинаре", score: 95, daysAgo: 4 },
      { subject: "Гражданский процесс", work: "тест", score: 87, daysAgo: 8 },
      { subject: "Европейское право", work: "эссе", score: 90, daysAgo: 11 },
      { subject: "Уголовный процесс", work: "контрольная работа", score: 85, daysAgo: 15 },
    ],
    session: [
      { subject: "Международное право", control: "зачёт", date: "2026-12-22" },
      { subject: "Гражданское и торговое право зарубежных стран", control: "зачёт", date: "2026-12-23" },
      { subject: "Криминология", control: "зачёт", date: "2026-12-24" },
      { subject: "Иностранный язык в сфере юриспруденции", control: "зачёт", date: "2026-12-25" },
      { subject: "Финансовое право", control: "экзамен", date: "2027-01-12" },
      { subject: "Гражданский процесс", control: "экзамен", date: "2027-01-16" },
      { subject: "Уголовный процесс", control: "экзамен", date: "2027-01-20" },
      { subject: "Европейское право", control: "экзамен", date: "2027-01-24", extra: "и курсовая работа" },
    ],
    deadline: { title: "Срок сдачи курсовой", text: "Европейское право: сдать курсовую работу научному руководителю", inDays: 12 },
  },
  "МИЭП-12": {
    past: [],
    mid: [
      { subject: "Математический анализ", work: "контрольная работа", score: 48, daysAgo: 2, retakeIn: 9 },
      { subject: "Микроэкономика", work: "контрольная работа", score: 84, daysAgo: 5 },
      { subject: "Английский язык", work: "тест", score: 91, daysAgo: 7 },
      { subject: "История России", work: "доклад на семинаре", score: 88, daysAgo: 10 },
      { subject: "Линейная алгебра", work: "контрольная работа", score: 76, daysAgo: 13 },
    ],
    session: [
      { subject: "Английский язык", control: "зачёт", date: "2026-12-22" },
      { subject: "Философия", control: "зачёт", date: "2026-12-23" },
      { subject: "Введение в мировую энергетику", control: "зачёт", date: "2026-12-25" },
      { subject: "Микроэкономика", control: "экзамен", date: "2027-01-13" },
      { subject: "Математический анализ", control: "экзамен", date: "2027-01-17" },
      { subject: "Линейная алгебра", control: "экзамен", date: "2027-01-21" },
      { subject: "История России", control: "экзамен", date: "2027-01-25" },
    ],
    deadline: { title: "Срок сдачи эссе", text: "История России: сдать эссе к семинару", inDays: 6 },
  },
};

/** Буква и слово по стобалльной шкале. Границы как в балльно-рейтинговой системе, уточнить у команды при необходимости. */
export function letter(score: number): { letter: string; word: string; pass: boolean } {
  if (score >= 90) return { letter: "A", word: "отлично", pass: true };
  if (score >= 82) return { letter: "B", word: "хорошо", pass: true };
  if (score >= 75) return { letter: "C", word: "хорошо", pass: true };
  if (score >= 67) return { letter: "D", word: "удовлетворительно", pass: true };
  if (score >= 60) return { letter: "E", word: "удовлетворительно", pass: true };
  return { letter: "F", word: "неудовлетворительно", pass: false };
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
/** Ближайший будний день не раньше даты: пересдачи и сроки не выпадают на выходные. */
const weekdayFrom = (date: string) => (weekday(date) === 5 ? addDays(date, 2) : weekday(date) === 6 ? addDays(date, 1) : date);

function computed(group: string) {
  const rec = RECORDS[group];
  if (!rec) return null;
  const today = moscow(now()).date;
  const mid = rec.mid.map((m) => ({
    ...m,
    ...letter(m.score),
    date: addDays(today, -m.daysAgo),
    retake: m.retakeIn ? weekdayFrom(addDays(today, m.retakeIn)) : undefined,
    key: `grade:${group}:${m.subject}:${m.work}`,
  }));
  const deadline = rec.deadline && { ...rec.deadline, due: weekdayFrom(addDays(today, rec.deadline.inDays)), key: `deadline:${group}:${rec.deadline.title}` };
  return { rec, today, mid, deadline };
}

/** Раздел «Учёба»: семестры, сводка «как дела», текущий или выбранный прошлый семестр. */
export async function getStudy(sem?: unknown) {
  const user = await requireStudent();
  const c = computed(user.groupName ?? "");
  if (!c) return null;
  const { rec, mid, deadline } = c;
  const current = rec.past.length + 1;
  // Год поступления по курсу: учебный год начинается в сентябре
  const d = now();
  const yearStart = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  const admitted = yearStart - (user.course ?? 1) + 1;
  // Нечётный семестр осенью, чётный весной следующего календарного года
  const season = (n: number) => (n % 2 ? "осень" : "весна");
  const year = (n: number) => admitted + Math.floor(n / 2);
  const n = Number(sem);
  const selected = Number.isInteger(n) && n >= 1 && n < current ? n : current;

  const debts = mid.filter((m) => !m.pass);
  const rating = (p: { exams: Item[]; credits: Item[] }) => avg([...p.exams, ...p.credits].map((i) => i.score));

  const summary = {
    debts: debts.map((m) => ({ subject: m.subject, work: m.work, retake: m.retake ? dayLabel(m.retake) : "" })),
    // Средний балл семестра, который идёт сейчас: по текущей аттестации
    average: avg(mid.map((m) => m.score)),
    deadline: deadline && { title: deadline.title, text: deadline.text, due: dayLabel(deadline.due) },
  };

  // Курсы и их семестры: осень и весна. Весна текущего курса ещё не началась, она видна, но не открывается
  const courses = Array.from({ length: Math.ceil(current / 2) }, (_, i) => i + 1)
    .reverse()
    .map((course) => ({
      course,
      semesters: [2 * course - 1, 2 * course].map((n) => ({ n, season: season(n), future: n > current, current: n === current })),
    }));
  const semesters = Array.from({ length: current }, (_, i) => ({ n: i + 1, title: `${season(i + 1) === "осень" ? "Осень" : "Весна"} ${year(i + 1)}`, current: i + 1 === current })).reverse();
  // Динамика: средний балл каждого прошлого семестра и текущей аттестации сейчас
  const trend = [...rec.past.map((p, i) => ({ n: i + 1, score: rating(p), current: false })), { n: current, score: summary.average, current: true }];
  if (selected === current) {
    return {
      courses,
      semesters,
      selected,
      summary,
      trend,
      current: {
        mid: mid.map((m) => ({ subject: m.subject, work: m.work, score: m.score, letter: m.letter, word: m.word, pass: m.pass, date: dayLabel(m.date), retake: m.retake ? dayLabel(m.retake) : "" })),
        session: rec.session.map((s) => ({ subject: s.subject, control: s.control, date: dayLabel(s.date), extra: s.extra })),
      },
      past: null,
    };
  }
  const p = rec.past[selected - 1];
  const all = [...p.exams, ...p.credits];
  const row = (i: Item) => ({ subject: i.subject, control: i.control, score: i.score, extra: i.extra, ...letter(i.score) });
  return {
    courses,
    semesters,
    selected,
    summary,
    trend,
    current: null,
    past: { score: rating(p), exams: p.exams.map(row), credits: p.credits.map(row), passed: all.every((i) => letter(i.score).pass) },
  };
}

export type StudyNotice = { key: string; kind: "grade" | "debt" | "deadline" | "announce"; title: string; text: string; href: string; at: Date };

/**
 * Для ленты уведомлений и «Сегодня»: оценки текущей аттестации за неделю, незачёт с пересдачей,
 * срок (курсовая, эссе), новости и объявления деканата. Вызывать после requireStudent: группа из сессии.
 */
export function studyNotices(group: string): StudyNotice[] {
  const c = computed(group);
  if (!c) return [];
  const at = (date: string, hhmm = "18:00") => new Date(`${date}T${hhmm}:00+03:00`);
  const grades = c.mid
    .filter((m) => m.daysAgo <= 7)
    .map(
      (m): StudyNotice =>
        m.pass
          ? { key: m.key, kind: "grade", title: "Новая оценка", text: `${m.subject}, ${m.work}: ${m.score}, ${m.word}`, href: "/study", at: at(m.date) }
          : { key: m.key, kind: "debt", title: "Не зачтено", text: `${m.subject}, ${m.work}: ${m.score}. Пересдача ${m.retake ? dayLabel(m.retake) : "по договорённости"}`, href: "/study", at: at(m.date) },
    );
  const d = c.deadline;
  const deadline: StudyNotice[] = d ? [{ key: d.key, kind: "deadline", title: d.title, text: `${d.text} до ${dayLabel(d.due)}`, href: "/study", at: at(addDays(c.today, -3), "10:00") }] : [];
  // Новости и объявления деканата для всех групп. Даты от текущей, чтобы лента была свежей в любой день
  const announce: StudyNotice[] = [
    {
      key: "announce:session-2026",
      kind: "announce",
      title: "Зачётная неделя и сессия",
      text: "Зачётная неделя с 21 декабря, экзаменационная сессия с 11 января. Даты по дисциплинам в разделе «Учёба»",
      href: "/study",
      at: at(addDays(c.today, -5), "12:00"),
    },
    {
      key: "announce:career-week",
      kind: "announce",
      title: "Неделя карьеры",
      text: `С ${dayLabel(weekdayFrom(addDays(c.today, 7)))} встречи с выпускниками и работодателями в главном корпусе. Вход по студенческому`,
      href: "",
      at: at(addDays(c.today, -1), "15:00"),
    },
    {
      key: "announce:library",
      kind: "announce",
      title: "Библиотека в сессию",
      text: "С 14 декабря читальный зал работает до 21:00, по субботам с 10:00 до 18:00",
      href: "",
      at: at(addDays(c.today, -9), "11:00"),
    },
  ];
  return [...grades, ...deadline, ...announce];
}

/** Что из учёбы поднять в «Требует внимания»: незачёт, оценка за последние два дня, срок в ближайшие две недели. */
export function studyAttention(group: string) {
  const c = computed(group);
  if (!c) return [];
  return studyNotices(group).filter(
    (n) => n.kind === "debt" || (n.kind === "grade" && c.mid.find((m) => m.key === n.key)!.daysAgo <= 2) || (n.kind === "deadline" && c.deadline && c.deadline.inDays <= 14),
  );
}
