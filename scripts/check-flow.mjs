// Сквозной сценарий: студент заказывает справку, сотрудник берёт в работу и задаёт вопрос,
// студент отвечает, сотрудник видит ответ и выдаёт справку, проверка по QR открывается без входа.
// Создаёт заявку в базе, поэтому только локально.
// Запуск: set -a && . ./.env && set +a && node scripts/check-flow.mjs http://localhost:3000
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
  await settle(page);
};
const press = async (page, label) => {
  await page.locator(`button::-p-text(${label})`).click();
};
const waitText = (page, t) => page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 10000 }, t).then(() => true, () => false);

async function session(login, password) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
  if (login) {
    await page.type("input[name=login]", login);
    await page.type("input[name=password]", password);
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
  }
  return page;
}

const student = await session("student1", process.env.SEED_PASSWORD_STUDENT1);
const staff = await session("dekanat", process.env.SEED_PASSWORD_STAFF);

// 1. Студент заказывает справку об обучении
await go(student, "/documents/new?type=study");
await student.click("button[type=submit]");
await student.waitForFunction(() => /^\/documents\/[0-9a-f-]{36}$/.test(location.pathname), { timeout: 10000 });
const id = new URL(student.url()).pathname.split("/").pop();
await waitText(student, "История");
const number = (await text(student)).match(/№ (\d+)/)?.[1];
check(Boolean(id && number), `студент отправил заявку № ${number}`);

// 2. Сотрудник видит её в новых и берёт в работу
await go(staff, "/staff");
check(Boolean(await staff.$(`[role=tabpanel] a[href="/staff/${id}"]`)), "заявка появилась во вкладке «Новые» у сотрудника");
await go(staff, `/staff/${id}`);
check((await text(staff)).includes("Соколова Анна"), "в карточке видно, чья заявка");
await press(staff, "Взять в работу");
check(await waitText(staff, "Справка готова"), "после «Взять в работу» появилась кнопка выдачи");

// 3. Сотрудник задаёт вопрос
const QUESTION = "Справка нужна с указанием срока обучения?";
await press(staff, "Задать вопрос");
await staff.waitForSelector("[role=dialog] textarea");
await staff.type("[role=dialog] textarea", QUESTION);
await press(staff, "Отправить");
check(await waitText(staff, "Ждём ответа студента"), "после вопроса заявка ждёт студента");

// 4. Студент видит вопрос и отвечает
await go(student, `/documents/${id}`);
check((await text(student)).includes(QUESTION), "студент видит вопрос деканата в карточке заявки");
await press(student, "Ответить");
await student.waitForSelector("#chat-message");
await settle(student);
await student.type("#chat-message", "Да, со сроком");
await student.click('button[aria-label="Отправить"]');
check(await waitText(student, "Ответ отправлен"), "ответ студента отправлен");

// 5. Сотрудник видит новый ответ и выдаёт справку
await go(staff, "/staff");
await staff.locator("button[role=tab]::-p-text(В работе)").click();
await settle(staff);
const row = await staff.$eval(`a[href="/staff/${id}"]`, (a) => a.innerText).catch(() => "");
check(row.includes("Новый ответ"), "в очереди у заявки метка «Новый ответ»");
await go(staff, `/staff/${id}`);
const card = await text(staff);
check(card.includes("Да, со сроком") && card.includes("новое"), "в истории ответ студента с пометкой «новое»");
await press(staff, "Справка готова");
await staff.waitForSelector("[role=dialog] textarea");
await press(staff, "Выдать");
check(await waitText(staff, "Справка выдана"), "справка выдана");
await go(staff, `/staff/${id}`);
check(!(await text(staff)).includes("Задать вопрос"), "у закрытой заявки нет кнопок действий");

// 6. Студент видит готовую справку, проверка по QR открывается без входа
await go(student, `/documents/${id}`);
check((await text(student)).includes("Справка готова"), "студент видит «Справка готова»");
await go(student, `/documents/${id}/document`);
const verify = await student.$eval("[data-verify-link]", (a) => a.getAttribute("href")).catch(() => null);
const anon = await session();
if (verify) await go(anon, new URL(verify).pathname);
check(Boolean(verify) && (await text(anon)).includes("Документ действителен"), "проверка подлинности без входа: «Документ действителен»");

await browser.close();
console.log(failures ? `\nПровалено проверок: ${failures}` : "\nСквозной сценарий пройден");
process.exit(failures ? 1 : 0);
