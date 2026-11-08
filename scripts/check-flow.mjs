// Сквозной сценарий: студент заказывает справку, сотрудник берёт в работу и спрашивает в переписке,
// студент отвечает и пишет ещё, сотрудник видит новые сообщения, отвечает и выдаёт справку с комментарием,
// переписка закрывается, проверка по QR открывается без входа. Плюс отмена заявки студентом, исправление ФИО сотрудником
// и переписка в двух окнах сразу: всё приходит без перезагрузки, «прочитано» только у открытой переписки.
// Создаёт заявки в базе, поэтому только локально.
// Запуск: set -a && . ./.env && set +a && node scripts/check-flow.mjs http://localhost:3000
// В окне компьютера: FLOW_SIZE=1366x768 node scripts/check-flow.mjs <адрес>
import puppeteer from "puppeteer-core";
import path from "node:path";

const base = process.argv[2];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe"),
});
let failures = 0;
const check = (ok, text) => {
  console.log(`${ok ? "ok    " : "ОШИБКА"} ${text}`);
  if (!ok) failures++;
};
const text = (page) => page.evaluate(() => document.body.innerText);
// Переход страницы глотает нажатия около 0,5 с, поэтому ждём конца анимаций
const settle = (page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity));
const go = async (page, p) => {
  await page.goto(new URL(p, base).href, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-back], h1", { timeout: 10000 }).catch(() => {});
  await settle(page);
};
const press = (page, label) => page.locator(`button::-p-text(${label})`).click();
const waitText = (page, t, where = "body") =>
  page
    .waitForFunction((t, w) => document.querySelector(w)?.innerText.includes(t), { timeout: 10000 }, t, where)
    .then(
      () => true,
      () => false,
    );
// Открыть шторку переписки, написать и дождаться, что сообщение пришло с сервера
async function chat(page, trigger, message) {
  await press(page, trigger);
  await page.waitForSelector("[role=log]");
  await settle(page);
  if (!message) return;
  await page.type("#chat-message", message);
  await page.click('button[aria-label="Отправить"]');
  await page.waitForFunction(
    (m) => document.querySelector("[role=log]").innerText.includes(m) && !document.querySelector("[role=log]").innerText.includes("отправляется"),
    { timeout: 10000 },
    message,
  );
}
const closeChat = async (page) => {
  await page.click('button[aria-label="Свернуть переписку"]');
  await page.waitForSelector("[role=log]", { hidden: true });
  await settle(page);
};

async function session(login, password) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  // FLOW_SIZE=1366x768: тот же сценарий в окне компьютера (меню слева, переписка панелью справа)
  const [width, height] = (process.env.FLOW_SIZE ?? "360x780").split("x").map(Number);
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 1024, hasTouch: width < 1024 });
  await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
  if (login) {
    await page.type("input[name=login]", login);
    await page.type("input[name=password]", password);
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
  }
  return page;
}

async function order(page) {
  await go(page, "/documents/new?type=study");
  await page.click("button[type=submit]");
  await page.waitForFunction(() => /^\/documents\/[0-9a-f-]{36}$/.test(location.pathname), { timeout: 10000 });
  await waitText(page, "История");
  await settle(page);
  return {
    id: new URL(page.url()).pathname.split("/").pop(),
    number: (await text(page)).match(/№ (\d+)/)?.[1],
  };
}

const student = await session("student1", process.env.SEED_PASSWORD_STUDENT1);
const staff = await session("dekanat", process.env.SEED_PASSWORD_STAFF);

// 1. Студент заказывает справку об обучении
const { id, number } = await order(student);
check(Boolean(id && number), `студент отправил заявку № ${number}`);

// 2. Сотрудник видит её в новых и берёт в работу
await go(staff, "/staff");
check(Boolean(await staff.$(`[role=tabpanel] a[href="/staff/${id}"]`)), "заявка появилась во вкладке «Новые» у сотрудника");
await go(staff, `/staff/${id}`);
check((await text(staff)).includes("Соколова Анна"), "в карточке видно, чья заявка");
await press(staff, "Взять в работу");
check(await waitText(staff, "Выдать справку"), "после «Взять в работу» появилась кнопка «Выдать справку»");

// 3. Сотрудник запрашивает уточнение: заявка на паузе, у сотрудника «На уточнении» и «Вы спрашиваете»
const QUESTION = "Справка нужна с указанием срока обучения?";
await press(staff, "Запросить уточнение");
await staff.waitForSelector("[role=dialog] textarea");
await settle(staff);
await staff.type("[role=dialog] textarea", QUESTION);
await staff.click("[role=dialog] button[type=submit]");
check(await waitText(staff, "На уточнении"), "после «Запросить уточнение» заявка «На уточнении»");
check((await text(staff)).includes("Вы спрашиваете") && !(await text(staff)).includes("Запросить уточнение"), "у сотрудника «Вы спрашиваете», повторно запросить нельзя");

// 3б. Студент видит счётчик на колокольчике и уведомление о вопросе, после открытия счётчик гаснет
await go(student, "/documents");
const bell = await student.$eval('header a[href="/notifications"]', (a) => a.getAttribute("aria-label"));
check(/новых: \d+/.test(bell), `на колокольчике счётчик новых («${bell}»)`);
await go(student, "/notifications");
const notice = await student.$eval(`main a[href="/documents/${id}"]`, (a) => a.innerText).catch(() => "");
check(notice.includes("Деканат задал вопрос") && notice.includes("Нужен ответ") && notice.includes(QUESTION), "в уведомлениях вопрос деканата с меткой «Нужен ответ»");
// Отметка «прочитано» уходит на сервер после показа ленты, ждём её и открываем другую страницу
await student.waitForNetworkIdle({ idleTime: 500 });
await go(student, "/documents");
const cleared = await student.$eval('header a[href="/notifications"]', (a) => a.getAttribute("aria-label"));
check(cleared === "Уведомления", `после открытия уведомлений счётчик погас («${cleared}»)`);

// 4. Студент отвечает, переписка не закрывается, можно написать ещё
await go(student, `/documents/${id}`);
check((await text(student)).includes(QUESTION), "студент видит вопрос деканата в карточке заявки");
check((await text(student)).includes("Открыть переписку"), "в истории есть «Открыть переписку», пока деканат ждёт ответа");
await chat(student, "Ответить", "Да, со сроком");
const log = await student.$eval("[role=log]", (l) => l.innerText);
check(!log.includes("Ответ отправлен") && !/сейчас/.test(log), "в переписке нет служебной строки «сейчас. Ответ отправлен»");
check(Boolean(await student.$("#chat-message")), "после ответа поле ввода осталось");
await student.type("#chat-message", "И ещё: можно на английском?");
await student.click('button[aria-label="Отправить"]');
check(await waitText(student, "можно на английском", "[role=log]"), "второе сообщение подряд отправлено");
await closeChat(student);
check(
  await student
    .waitForFunction(() => !document.body.innerText.includes("Деканат спрашивает"), { timeout: 10000 })
    .then(
      () => true,
      () => false,
    ),
  "после ответа заявка снова в работе",
);

// 5. Сотрудник видит новые сообщения, отвечает без паузы и выдаёт справку с комментарием
await go(staff, "/staff");
await staff.locator("button[role=tab]::-p-text(В работе)").click();
await settle(staff);
const row = await staff.$eval(`a[href="/staff/${id}"]`, (a) => a.innerText).catch(() => "");
check(row.includes("Новый ответ"), "в очереди у заявки метка «Новый ответ»");
await go(staff, `/staff/${id}`);
check((await text(staff)).includes("2 новых сообщения"), "в истории «2 новых сообщения»");
await chat(staff, "Переписка", "Да, сделаем на английском");
check((await staff.$eval("[role=log]", (l) => l.innerText)).includes("Да, со сроком"), "сотрудник видит ответ студента в той же переписке");
await closeChat(staff);
check(!(await text(staff)).includes("На уточнении"), "сообщение сотрудника в переписке не ставит заявку на паузу");
await press(staff, "Выдать справку");
await staff.waitForSelector("[role=dialog] textarea");
await settle(staff);
await staff.type("[role=dialog] textarea", "Справка подписана, на английском");
await staff.click("[role=dialog] button[type=submit]");
check(await waitText(staff, "Справка выдана"), "справка выдана");

// 5б. Уведомление «Справка готова» с комментарием
await go(student, "/notifications");
const readyNotice = await student.$$eval(`main a[href="/documents/${id}"]`, (as) => as.map((a) => a.innerText).join(" "));
check(readyNotice.includes("Справка готова") && readyNotice.includes("Справка подписана"), "в уведомлениях «Справка готова» с комментарием деканата");

// 6. Студент: комментарий деканата подписан, в переписке сообщением, переписка закрыта
await go(student, `/documents/${id}`);
const page = await text(student);
check(page.includes("Справка готова") && page.includes("Комментарий деканата"), "студент видит «Справка готова» и подписанный комментарий деканата");
await chat(student, "Открыть переписку");
const final = await student.$eval("[role=log]", (l) => l.innerText);
check(
  final.indexOf("Справка подписана") >= 0 && final.indexOf("Справка подписана") < final.lastIndexOf("Справка готова"),
  "комментарий сообщением деканата, под ним строка «Справка готова»",
);
check(!(await student.$("#chat-message")) && (await text(student)).includes("переписка завершена"), "после выдачи писать нельзя: переписка завершена");
await closeChat(student);

// 7. Проверка по QR открывается без входа
await go(student, `/documents/${id}/document`);
const verify = await student.$eval("[data-verify-link]", (a) => a.getAttribute("href")).catch(() => null);
const anon = await session();
if (verify) await go(anon, new URL(verify).pathname);
check(Boolean(verify) && (await text(anon)).includes("Документ действителен"), "проверка подлинности без входа: «Документ действителен»");

// 8. Студент отменяет заявку, сотрудник видит её в закрытых
const second = await order(student);
await press(student, "Отменить заявку");
await student.waitForSelector("[role=dialog]");
await student.locator("[role=dialog] button::-p-text(Отменить)").click();
check(await waitText(student, "Заявку отменили"), "студент отменил заявку, полосы этапов нет");
check(!(await student.$("button::-p-text(Отменить заявку)")), "у отменённой заявки нет кнопки отмены");
await go(staff, `/staff/${second.id}`);
check((await text(staff)).includes("Отменена") && !(await text(staff)).includes("Взять в работу"), "сотрудник видит отменённую заявку без действий");

// 8. Исправление личных данных: сотрудник правит ФИО в окне «Исправить данные», студент видит его в профиле.
// Отчество меняется на «Дмитревна» и обратно, чтобы не оставлять в базе изменённое ФИО
async function fixName(middle) {
  await go(student, "/documents/new?type=data_fix");
  await student.type("textarea", "В отчестве ошибка");
  await student.click("button[type=submit]");
  await student.waitForFunction(() => /^\/documents\/[0-9a-f-]{36}$/.test(location.pathname), { timeout: 10000 });
  const fix = new URL(student.url()).pathname.split("/").pop();
  await go(staff, `/staff/${fix}`);
  await press(staff, "Взять в работу");
  await waitText(staff, "Исправить данные");
  await settle(staff);
  await press(staff, "Исправить данные");
  await staff.waitForSelector("#name-middle");
  await settle(staff);
  await staff.$eval("#name-middle", (i) => i.select());
  await staff.type("#name-middle", middle);
  await staff.locator("[role=dialog] button[type=submit]").click();
  return fix;
}
await fixName("Дмитревна1");
check(await waitText(staff, "только буквы", "[role=dialog]"), "сервер не принимает отчество с цифрой");
await staff.$eval("#name-middle", (i) => i.select());
await staff.type("#name-middle", "Дмитревна");
await staff.locator("[role=dialog] button[type=submit]").click();
await staff.waitForSelector("[role=dialog]", { hidden: true, timeout: 10000 });
await go(student, "/profile");
check((await text(student)).includes("Дмитревна"), "студент видит исправленное ФИО в профиле");
await fixName("Дмитриевна");
await staff.waitForSelector("[role=dialog]", { hidden: true, timeout: 10000 });
await go(student, "/profile");
check((await text(student)).includes("Дмитриевна"), "ФИО вернули как было");

// 9. Два окна одновременно: сообщения и статус приходят без перезагрузки, «прочитано» только у открытой переписки.
// Страница заявки спрашивает сервер раз в 3 секунды, поэтому ждём до 10 секунд
const LIVE = 10000;
const until = (page, fn, ...args) =>
  page.waitForFunction(fn, { timeout: LIVE }, ...args).then(
    () => true,
    () => false,
  );
const logText = (page) => page.$eval("[role=log]", (l) => l.innerText).catch(() => "");
const live = await order(student);
await go(staff, `/staff/${live.id}`);
await press(staff, "Взять в работу");
await waitText(staff, "Запросить уточнение");
await settle(staff);
check(await waitText(student, "В работе"), "студент без обновления видит «В работе»");

await chat(student, "Написать в деканат", "Здравствуйте, когда будет готово?");
check(
  await until(staff, () => /1 нов/.test(document.querySelector("main").innerText)),
  "сотрудник без обновления видит новое сообщение студента в истории",
);
// Карточку сотрудник открыл, переписку нет: сообщение не прочитано
await new Promise((r) => setTimeout(r, 4000));
check((await logText(student)).includes("доставлено") && !(await logText(student)).includes("прочитано"), "пока сотрудник не открыл переписку, у студента «доставлено»");

await press(staff, "Переписка");
await staff.waitForSelector("[role=log]");
await settle(staff);
check((await logText(staff)).includes("когда будет готово"), "сотрудник видит сообщение в переписке");
check(
  await until(student, () => document.querySelector("[role=log]")?.innerText.includes("прочитано")),
  "сотрудник открыл переписку, у студента без обновления «прочитано»",
);

await staff.type("#chat-message", "Завтра к обеду");
await staff.click('button[aria-label="Отправить"]');
check(
  await until(student, () => document.querySelector("[role=log]")?.innerText.includes("Завтра к обеду")),
  "ответ сотрудника появился в открытой переписке студента без обновления",
);
check(
  await until(staff, () => /Завтра к обеду[\s\S]*прочитано/.test(document.querySelector("[role=log]")?.innerText ?? "")),
  "переписка у студента открыта, сотрудник видит «прочитано»",
);

// Студент закрыл переписку: новое сообщение доставлено, но не прочитано, даже после ленты уведомлений
await closeChat(student);
await staff.type("#chat-message", "Можно забрать в каб. 2105");
await staff.click('button[aria-label="Отправить"]');
await staff.waitForFunction(() => document.querySelector("[role=log]").innerText.includes("каб. 2105"), { timeout: LIVE });
await go(student, "/notifications");
await student.waitForNetworkIdle({ idleTime: 500 });
await new Promise((r) => setTimeout(r, 4000));
check(
  /каб\. 2105\s+[^\n]*доставлено/.test(await logText(staff)) && !/каб\. 2105[\s\S]*прочитано/.test(await logText(staff)),
  "студент видел только уведомление, у сотрудника «доставлено»",
);

// Статус тоже приходит сам: сотрудник запрашивает уточнение, студент на странице заявки видит вопрос
await go(student, `/documents/${live.id}`);
await closeChat(staff);
await press(staff, "Запросить уточнение");
await staff.waitForSelector("[role=dialog] textarea");
await settle(staff);
await staff.type("[role=dialog] textarea", "Нужна ли печать?");
await staff.click("[role=dialog] button[type=submit]");
check(await until(student, () => document.body.innerText.includes("Нужна ли печать?")), "студент без обновления видит «Нужно уточнение» и вопрос");

await browser.close();
console.log(failures ? `\nПровалено проверок: ${failures}` : "\nСквозной сценарий пройден");
process.exit(failures ? 1 : 0);
