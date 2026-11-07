// Путь по кабинету в этой вкладке браузера: адреса целиком, с параметрами (?type=...).
// Нужен «назад» на вложенных страницах и закрытию профиля и уведомлений повторным нажатием.
// Это память браузера, на сервере не используется.

const trail: string[] = [];

// Подписка на изменения пути (для useSyncExternalStore): кнопки, которые считают адрес возврата
// при отрисовке, перерисовываются сразу, как только путь обновился. Иначе в них залипает старый адрес.
let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version++;
  listeners.forEach((l) => l());
};
export const subscribeTrail = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const trailVersion = () => version;

/** Адрес без служебных параметров (?sent=1 после отправки заявки). */
export function cleanUrl(path: string, search: string) {
  const params = new URLSearchParams(search);
  params.delete("sent");
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

// Возврат отличаем по действию, а не по совпадению адреса: «профиль → форма → снова профиль» это шаг вперёд.
// Возврат: «назад», закрытие профиля или уведомлений, системная кнопка «назад» браузера ("*").
let goingBack: string | null = null;
export function markBack(url: string) {
  goingBack = url;
}

/**
 * Запомнить открытую страницу. При возврате всё после неё забываем, иначе добавляем в конец.
 * Возврат на страницу, которой в пути нет, это шаг вверх по разделу (путь начался с середины,
 * например браузер перезагрузил страницу после проверки подлинности). Тогда путь начинается заново с неё,
 * иначе следующий «назад» привёл бы обратно туда, откуда поднялись.
 */
export function recordVisit(url: string) {
  const back = goingBack === url || goingBack === "*";
  goingBack = null;
  const i = trail.lastIndexOf(url);
  if (back) {
    if (i >= 0) trail.length = i + 1;
    else trail.splice(0, trail.length, url);
    changed();
    return;
  }
  if (trail[trail.length - 1] === url) return;
  trail.push(url);
  if (trail.length > 30) trail.shift();
  changed();
}

const isForm = (url: string) => url.startsWith("/documents/new");

/**
 * Предыдущая страница перед текущей. Работает и до, и после того, как текущая записана в путь.
 * skipForms: «назад» не возвращает в уже отправленную форму, а профиль и уведомления возвращают.
 */
export function previousOf(current: string, { skipForms }: { skipForms: boolean }) {
  // Текущая уже записана, только если она последняя. Более раннее посещение того же адреса не в счёт:
  // «профиль → форма → снова профиль» должен вернуть в форму, а не искать первый профиль.
  const before = trail[trail.length - 1] === current ? trail.slice(0, -1) : trail;
  for (let j = before.length - 1; j >= 0; j--) {
    if (before[j] === current || (skipForms && isForm(before[j]))) continue;
    return before[j];
  }
  return null;
}

/** Подпись ссылки «назад» по адресу страницы. */
export function labelFor(url: string) {
  const path = url.split("?")[0];
  const labels: Record<string, string> = {
    "/": "Сегодня",
    "/schedule": "Расписание",
    "/study": "Учёба",
    "/documents": "Документы",
    "/documents/all": "Мои заявки",
    "/profile": "Профиль",
    "/notifications": "Уведомления",
    "/staff": "Очередь",
  };
  if (labels[path]) return labels[path];
  if (/^\/documents\/[0-9a-f-]{36}$/.test(path)) return "Заявка";
  if (/^\/documents\/[0-9a-f-]{36}\/document$/.test(path)) return "Справка";
  return null;
}
