// Проверка навигации: «назад» ведёт на предыдущую страницу, профиль и уведомления закрываются туда,
// откуда их открыли, и нигде не появляется «Страница не найдена».
// Запуск: SHOT_LOGIN=student1 SHOT_PASSWORD=... node scripts/check-nav.mjs <адрес>
import puppeteer from "puppeteer-core";
import path from "node:path";

const base = process.argv[2];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe"),
});
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
let failures = 0;
const check = (ok, text) => {
  console.log(`${ok ? "ok    " : "ОШИБКА"} ${text}`);
  if (!ok) failures++;
};
const url = () => page.evaluate(() => location.pathname + location.search);
const settle = async () => {
  await page.waitForFunction(() => !document.querySelector("[aria-busy=true]"), { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity));
  await new Promise((r) => setTimeout(r, 150));
};
const go = async (p) => {
  await page.goto(new URL(p, base).href, { waitUntil: "networkidle0" });
  await settle();
};
// Нажать и дождаться перехода по клиентской навигации
const tap = async (selector, expected) => {
  if (!(await page.waitForSelector(selector, { timeout: 8000 }).catch(() => null))) return false;
  await page.$eval(selector, (el) => el.scrollIntoView({ block: "center" }));
  await page.tap(selector);
  await page.waitForFunction((e) => location.pathname + location.search === e, { timeout: 8000 }, expected).catch(() => {});
  await settle();
  const now = await url();
  const text = await page.evaluate(() => document.body.innerText);
  return now === expected && !text.includes("Страница не найдена");
};
const backLabel = () => page.$eval("[data-back]", (a) => a.textContent.trim()).catch(() => "нет");

await go("/login");
await page.type("input[name=login]", process.env.SHOT_LOGIN);
await page.type("input[name=password]", process.env.SHOT_PASSWORD);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);

const FIX = "/documents/new?type=data_fix";
const STUDY = "/documents/new?type=study";

// 1. Из профиля в исправление данных и назад
await go("/profile");
check(await tap(`a[href="${FIX}"]`, FIX), "профиль → «Нашли ошибку в данных» открывает форму");
check((await backLabel()) === "Профиль", `«назад» на форме подписан «Профиль» (сейчас «${await backLabel()}»)`);
check(await tap("[data-back]", "/profile"), "«назад» с формы возвращает в профиль");

// 2–4. Профиль и уведомления поверх формы закрываются обратно в форму
for (const [form, name, open, close] of [
  [FIX, "исправление данных", "Профиль", "Закрыть профиль"],
  [FIX, "исправление данных", "Уведомления", "Закрыть уведомления"],
  [STUDY, "справка об обучении", "Уведомления", "Закрыть уведомления"],
  [STUDY, "справка об обучении", "Профиль", "Закрыть профиль"],
]) {
  await go(form);
  const target = open === "Профиль" ? "/profile" : "/notifications";
  check(await tap(`a[aria-label^="${open}"]`, target), `${name} → ${open.toLowerCase()} открывается`);
  check(await tap(`a[aria-label="${close}"]`, form), `${open.toLowerCase()} закрывается обратно в форму «${name}»`);
}

// 5. Заявка из «Моих заявок»: «назад» в «Мои заявки»
await go("/documents/all");
const first = await page.$eval('[role=tabpanel] a[href^="/documents/"]', (a) => a.getAttribute("href"));
check(await tap(`[role=tabpanel] a[href="${first}"]`, first), "«Мои заявки» → заявка открывается");
check((await backLabel()) === "Мои заявки", `«назад» на заявке подписан «Мои заявки» (сейчас «${await backLabel()}»)`);
check(await tap("[data-back]", "/documents/all"), "«назад» с заявки возвращает в «Мои заявки»");

// 6. Профиль и уведомления с заявки и обратно
await go(first);
check(await tap('a[aria-label="Профиль"]', "/profile"), "заявка → профиль");
check(await tap('a[aria-label="Закрыть профиль"]', first), "профиль закрывается обратно в заявку");

// 7. Уведомления поверх профиля закрываются в профиль
await go("/profile");
check(await tap('a[aria-label^="Уведомления"]', "/notifications"), "профиль → уведомления");
check(await tap('a[aria-label="Закрыть уведомления"]', "/profile"), "уведомления закрываются в профиль");

// 8. Цепочки только нажатиями, как ходит человек
await go("/profile");
await tap(`a[href="${FIX}"]`, FIX);
check(await tap('a[aria-label="Профиль"]', "/profile"), "профиль → форма исправления → снова профиль");
check(await tap('a[aria-label="Закрыть профиль"]', FIX), "закрытие профиля возвращает в форму исправления");
check(await tap("[data-back]", "/profile"), "«назад» с этой формы снова ведёт в профиль");

await go("/documents");
await tap(`a[href="${FIX}"]`, FIX);
check(await tap('a[aria-label^="Уведомления"]', "/notifications"), "«Документы» → плитка «Нашли ошибку» → уведомления");
check(await tap('a[aria-label="Закрыть уведомления"]', FIX), "уведомления закрываются в форму, а не в «не найдено»");
check(await tap("[data-back]", "/documents"), "«назад» с формы ведёт в «Документы»");

// 8б. Сценарий команды: «Сегодня» → профиль → исправление → «назад» → закрыть профиль → «Сегодня»
await go("/");
check(await tap('a[aria-label="Профиль"]', "/profile"), "«Сегодня» → профиль");
check(await tap(`a[href="${FIX}"]`, FIX), "профиль → «Нашли ошибку в данных»");
check(await tap("[data-back]", "/profile"), "«назад» с формы в профиль");
check(await tap('a[aria-label="Закрыть профиль"]', "/"), "закрытие профиля после «назад» ведёт на «Сегодня», а не в форму");

// 8в. Заявка → справка → «назад» → «назад»: подписи и адреса не залипают после возврата
await go("/documents/all");
const ready = await page.$$eval('[role=tabpanel] li a', (as) => as.find((a) => /, готово /.test(a.textContent))?.getAttribute("href"));
if (ready) {
  await tap(`[role=tabpanel] a[href="${ready}"]`, ready);
  check(await tap(`a[href="${ready}/document"]`, `${ready}/document`), "заявка → «Открыть справку»");
  check(await tap("[data-back]", ready), "«назад» со справки в заявку");
  check((await backLabel()) === "Мои заявки", `после возврата на заявке «назад» подписан «Мои заявки» (сейчас «${await backLabel()}»)`);
  check(await tap("[data-back]", "/documents/all"), "второй «назад» ведёт в «Мои заявки»");

  // 8г. Случай команды: после проверки подлинности браузер вернулся на справку с перезагрузкой, путь пуст.
  // «Назад» поднимается по разделу: справка → заявка → «Документы», без круга обратно в справку.
  await go(`${ready}/document`);
  check(await tap("[data-back]", ready), "перезагруженная справка: «назад» ведёт в заявку");
  check((await backLabel()) === "Документы", `на заявке «назад» подписан «Документы» (сейчас «${await backLabel()}»)`);
  check(await tap("[data-back]", "/documents"), "второй «назад» ведёт в «Документы», а не снова в справку");
}

// 9. Отправили заявку: «назад» перепрыгивает отправленную форму (только локально, создаёт заявку)
if (process.env.ALLOW_WRITE) {
  await go("/documents");
  await tap(`a[href="${STUDY}"]`, STUDY);
  await page.tap("button[type=submit]");
  await page.waitForFunction(() => /^\/documents\/[0-9a-f-]{36}$/.test(location.pathname), { timeout: 10000 }).catch(() => {});
  await settle();
  check((await backLabel()) === "Документы", `после отправки «назад» подписан «Документы» (сейчас «${await backLabel()}»)`);
  check(await tap("[data-back]", "/documents"), "«назад» после отправки ведёт в «Документы», а не в форму");
}

// 10. Открыли профиль сразу по ссылке: закрытие ведёт на «Сегодня»
await go("/profile");
check(await tap('a[aria-label="Закрыть профиль"]', "/"), "профиль, открытый по ссылке, закрывается на «Сегодня»");

await browser.close();
console.log(failures ? `\nПровалено проверок: ${failures}` : "\nВсе проверки навигации пройдены");
process.exit(failures ? 1 : 0);
