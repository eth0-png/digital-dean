// Действия, которых нет в других проверках: все 4 вида заявок и ошибки формы, бумажная справка с экземплярами,
// отказ с причиной, согласование пересдачи, пустые причины в окнах деканата, готовая справка: «Поделиться», QR, проверка
// без входа, уведомления о готовности и отказе, «Нет связи» без сети, лимит попыток входа.
// Студент в телефоне (с CHROME_REMOTE в Chrome эмулятора Android, там же проверка экранной клавиатуры в переписке),
// деканат в окне компьютера. Создаёт заявки и пробует лимит входа, поэтому только на локальном сервере.
// Запуск: set -a && . ./.env && set +a && node scripts/check-actions.mjs http://localhost:3000
import puppeteer from "puppeteer-core";
import path from "node:path";
import postgres from "postgres";
import { openPage, remote } from "./browser.mjs";

const base = process.argv[2];
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(base ?? "")) {
  console.error("Только локальный сервер: проверка создаёт заявки и упирается в лимит попыток входа");
  process.exit(2);
}
let failures = 0;
const check = (ok, text) => {
  console.log(`${ok ? "ok    " : "ОШИБКА"} ${text}`);
  if (!ok) failures++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = (page) =>
  page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity), { timeout: 10000 })
    .catch(() => {});
const text = (page) => page.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText);
const go = async (page, p) => {
  await page.goto(new URL(p, base).href, { waitUntil: "networkidle0" });
  await settle(page);
};
const click = async (page, sel) => {
  await page.$eval(sel, (el) => el.scrollIntoView({ block: "center" })).catch(() => {});
  await settle(page);
  await page.locator(sel).click();
};
const until = (page, fn, ...args) =>
  page.waitForFunction(fn, { timeout: 10000 }, ...args).then(
    () => true,
    () => false,
  );
async function login(page, user, password) {
  await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
  await page.type("input[name=login]", user);
  await page.type("input[name=password]", password);
  await page.keyboard.press("Enter"); // в Chrome эмулятора нажатие по «Войти» иногда не доходит
  await page.waitForFunction(() => location.pathname !== "/login", { timeout: 20000 }).catch(async () => {
    throw new Error(`Вход ${user} не прошёл: ${await page.evaluate(() => location.href + " " + (document.querySelector("[role=alert]")?.innerText ?? ""))}`);
  });
}

const db = postgres(process.env.DATABASE_URL ?? "postgres://dekanat@localhost:54329/dekanat", { max: 1 });
await db`delete from login_attempts`; // чистый лимит перед проверкой (база локальная, тестовая)

const { page: student, close: closeStudent } = await openPage();
const tag = remote ? "android" : "телефон";
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe") });
const staff = await browser.newPage();
await staff.setViewport({ width: 1366, height: 768 });
await login(student, "student1", process.env.SEED_PASSWORD_STUDENT1);
await login(staff, "dekanat", process.env.SEED_PASSWORD_STAFF);

// ---------- 1. Форма заявки: 4 вида, ошибки, бумажная справка ----------
async function order(type, fill) {
  await go(student, `/documents/new?type=${type}`);
  await fill?.();
  await click(student, "form button[type=submit]");
  const ok = await until(student, () => /^\/documents\/[0-9a-f-]{36}$/.test(location.pathname) || document.querySelector("[role=alert]"));
  const id = /^\/documents\/[0-9a-f-]{36}$/.test(new URL(student.url()).pathname) ? new URL(student.url()).pathname.split("/").pop() : null;
  return { ok, id, alert: await student.$eval("[role=alert]", (a) => a.innerText).catch(() => "") };
}

const study = await order("study", async () => {
  await click(student, '[aria-label="Куда нужна справка"] ::-p-text(Для визы)');
  await click(student, 'label[for="format-paper"]');
  await click(student, 'button[aria-label="Больше"]');
  await click(student, 'button[aria-label="Больше"]');
  await click(student, 'button[aria-label="Меньше"]');
});
check(Boolean(study.id), `${tag}: справка об обучении «Для визы», бумажная, 2 экземпляра отправлена`);
const military = await order("military");
check(Boolean(military.id), `${tag}: справка для военкомата отправлена`);

const retakeEmpty = await order("retake");
check(!retakeEmpty.id && retakeEmpty.alert.includes("Напишите дисциплину"), `${tag}: пересдача без текста не отправляется («${retakeEmpty.alert.trim()}»)`);
const retake = await order("retake", async () => {
  if (remote) await student.tap("#details"); // открываем экранную клавиатуру, как человек
  await student.type("#details", "Микроэкономика, удобно 18 или 20 ноября");
  if (!remote) return;
  await wait(1200);
  // С открытой клавиатурой видно и поле, и кнопку «Отправить заявку»: поле над закреплённой панелью, кнопка над клавиатурой
  const kb = await student.evaluate(() => {
    const f = document.querySelector("#details").getBoundingClientRect();
    const btn = document.querySelector("form button[type=submit]");
    const panel = btn.parentElement.getBoundingClientRect();
    const vv = window.visualViewport;
    return { field: Math.round(f.bottom), panel: Math.round(panel.top), button: Math.round(btn.getBoundingClientRect().bottom), visible: Math.round(vv.height + vv.offsetTop) };
  });
  check(kb.field <= kb.panel && kb.button <= kb.visible, `${tag}: с клавиатурой видно поле (низ ${kb.field}, панель с ${kb.panel}) и кнопку (низ ${kb.button}, видно до ${kb.visible})`);
});
check(Boolean(retake.id), `${tag}: заявление на пересдачу с текстом отправлено`);
const fixEmpty = await order("data_fix");
check(!fixEmpty.id && fixEmpty.alert.includes("Опишите"), `${tag}: исправление данных без текста не отправляется («${fixEmpty.alert.trim()}»)`);
const fix = await order("data_fix", () => student.type("#details", "В группе опечатка"));
check(Boolean(fix.id), `${tag}: заявка на исправление данных отправлена`);

await go(student, "/documents/new?type=chto-to");
check((await text(student)).includes("Страница не найдена"), `${tag}: несуществующий вид документа даёт «не найдено»`);

// У сотрудника видно, что выбрал студент
await go(staff, `/staff/${study.id}`);
const card = await text(staff);
check(card.includes("Для визы") && card.includes("бумажная, 2 экз."), "деканат видит цель «Для визы» и «бумажная, 2 экз.»");

// ---------- 2. Окна деканата: пустые причины, выдача, согласование, отказ ----------
async function staffAction(id, button, comment, expectError) {
  await go(staff, `/staff/${id}`);
  if (await staff.$("::-p-text(Взять в работу)")) {
    await click(staff, "button::-p-text(Взять в работу)");
    await until(staff, (b) => document.body.innerText.includes(b), button);
    await settle(staff);
  }
  await click(staff, `button::-p-text(${button})`);
  await staff.waitForSelector("[role=dialog] textarea");
  await settle(staff);
  let error = "";
  if (expectError) {
    await staff.click("[role=dialog] button[type=submit]");
    error = await staff
      .waitForSelector("[role=dialog] [role=alert]", { timeout: 5000 })
      .then((e) => e.evaluate((x) => x.innerText))
      .catch(() => "");
  }
  if (comment) await staff.type("[role=dialog] textarea", comment);
  await staff.click("[role=dialog] button[type=submit]");
  const closed = await staff.waitForSelector("[role=dialog]", { hidden: true, timeout: 10000 }).then(
    () => true,
    () => false,
  );
  return { error, closed };
}

const r1 = await staffAction(study.id, "Выдать справку", "Бумажные экземпляры в каб. 2105");
check(r1.closed, "деканат выдал справку об обучении");
const r2 = await staffAction(retake.id, "Согласовать пересдачу", "18 ноября в 10:00, ауд. 305", true);
check(r2.error.includes("Напишите дату") && r2.closed, `пересдачу без даты и места не согласовать («${r2.error.trim()}»), с ними согласована`);
const r3 = await staffAction(fix.id, "Отклонить", "Группу меняет учебный отдел, обратитесь в каб. 2110", true);
check(r3.error.includes("причину") && r3.closed, `отказ без причины не отправить («${r3.error.trim()}»), с причиной отклонено`);
await go(staff, `/staff/${military.id}`);
await click(staff, "button::-p-text(Взять в работу)");
await until(staff, () => document.body.innerText.includes("Запросить уточнение"));
await settle(staff);
await click(staff, "button::-p-text(Запросить уточнение)");
await staff.waitForSelector("[role=dialog] textarea");
await settle(staff);
await staff.click("[role=dialog] button[type=submit]");
const askErr = await staff
  .waitForSelector("[role=dialog] [role=alert]", { timeout: 5000 })
  .then((e) => e.evaluate((x) => x.innerText))
  .catch(() => "");
check(askErr.includes("что нужно"), `пустой вопрос студенту не отправить («${askErr.trim()}»)`);
await staff.keyboard.press("Escape");

// ---------- 3. Студент: результат, справка, «Поделиться», QR, проверка без входа ----------
await go(student, `/documents/${retake.id}`);
let t = await text(student);
check(t.includes("Готово") && t.includes("18 ноября в 10:00, ауд. 305") && t.includes("Комментарий деканата"), `${tag}: пересдача согласована, дата и место видны студенту`);
await go(student, `/documents/${fix.id}`);
t = await text(student);
check(t.includes("Отклонено") && t.includes("Группу меняет учебный отдел"), `${tag}: отказ с причиной виден студенту`);

await go(student, `/documents/${study.id}`);
t = await text(student);
check(t.includes("Справка готова") && t.includes("бумажная в каб. 2105"), `${tag}: справка готова, бумажная с копией QR`);
// «Поделиться»: где нет системного меню, ссылка копируется. Подменяем, чтобы проверить ссылку
await student.evaluate(() => {
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async (s) => (window.__copied = s) }, configurable: true });
});
await click(student, 'button[aria-label="Поделиться справкой"]');
const copied = await until(student, () => window.__copied).then(() => student.evaluate(() => window.__copied));
const toast = await until(student, () => document.body.innerText.includes("Ссылка скопирована"));
check(/\/verify\/[0-9a-f]{32}$/.test(copied ?? "") && toast, `${tag}: «Поделиться» копирует ссылку проверки и сообщает об этом`);

await click(student, `a[href="/documents/${study.id}/document"]`);
await until(student, (id) => location.pathname === `/documents/${id}/document`, study.id);
await student.waitForSelector("[data-verify-link]", { timeout: 10000 }).catch(() => {}); // лист справки догружается частями
await settle(student);
const qr = await student.$('[role=img][aria-label^="QR-код"] svg');
const verify = await student.$eval("[data-verify-link]", (a) => a.getAttribute("href")).catch(() => "");
check(Boolean(qr) && verify.includes("/verify/"), `${tag}: лист справки с QR-кодом и ссылкой проверки (${new URL(student.url()).pathname})`);
if (!verify) throw new Error("Нет ссылки проверки, дальше проверять нечего");
const anon = await (await browser.createBrowserContext()).newPage();
await anon.goto(new URL(new URL(verify).pathname, base).href, { waitUntil: "networkidle0" });
const v = await anon.evaluate(() => document.body.innerText);
check(v.includes("Документ действителен") && v.includes("Соколова А. Д.") && !v.includes("Анна"), "проверка по ссылке без входа: действителен, только инициалы");

// ---------- 4. Уведомления: готово и отказ, счётчик гаснет ----------
await go(student, "/");
const bell = await student.$eval('header a[href="/notifications"]', (a) => a.getAttribute("aria-label"));
await go(student, "/notifications");
t = await text(student);
check(/новых: \d+/.test(bell) && t.includes("Заявка отклонена") && t.includes("Группу меняет учебный отдел") && /готов/i.test(t), `${tag}: в уведомлениях готовность и отказ с причиной, на колокольчике «${bell}»`);
await student.waitForNetworkIdle({ idleTime: 500 }).catch(() => {});
await go(student, "/");
const cleared = await student.$eval('header a[href="/notifications"]', (a) => a.getAttribute("aria-label"));
check(cleared === "Уведомления", `${tag}: после ленты счётчик погас («${cleared}»)`);

// ---------- 5. Переписка: экранная клавиатура и «Нет связи» ----------
await go(student, `/documents/${military.id}`);
await click(student, "button::-p-text(Написать в деканат)");
await student.waitForSelector("#chat-message");
await settle(student);
await student.focus("#chat-message");
await wait(1200);
const kb = await student.evaluate(() => {
  const r = document.querySelector("#chat-message").getBoundingClientRect();
  const vv = window.visualViewport;
  return { bottom: Math.round(r.bottom), visible: Math.round(vv.height + vv.offsetTop), shrunk: vv.height < innerHeight - 100 };
});
if (remote) check(kb.bottom <= kb.visible, `${tag}: поле сообщения над экранной клавиатурой (низ поля ${kb.bottom}, видно до ${kb.visible}${kb.shrunk ? ", клавиатура открыта" : ""})`);
await student.type("#chat-message", "Проверка без сети");
// Сеть выключаем напрямую через отладку Chrome: setOfflineMode у puppeteer в Chrome эмулятора не срабатывает
const net = await student.createCDPSession();
await net.send("Network.enable");
const offlineMode = (offline) => net.send("Network.emulateNetworkConditions", { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await offlineMode(true);
await student.click('button[aria-label="Отправить"]');
const offline = await until(student, () => document.body.innerText.includes("Нет связи"));
const kept = await student.$eval("#chat-message", (x) => x.value);
await offlineMode(false);
check(offline && kept === "Проверка без сети", `${tag}: без сети «Нет связи», набранный текст остался`);
await student.click('button[aria-label="Отправить"]');
check(await until(student, () => document.querySelector("[role=log]")?.innerText.includes("Проверка без сети") && !document.querySelector("[role=log]").innerText.includes("отправляется")), `${tag}: связь вернулась, сообщение ушло`);

// ---------- 6. Лимит попыток входа ----------
const guest = await (await browser.createBrowserContext()).newPage();
let last = "";
for (let i = 0; i < 11; i++) {
  await guest.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
  await guest.type("input[name=login]", "student1");
  await guest.type("input[name=password]", `неверный-${i}`);
  await guest.keyboard.press("Enter");
  await guest.waitForSelector("[role=alert]", { timeout: 10000 }).catch(() => {});
  last = await guest.$eval("[role=alert]", (a) => a.innerText).catch(() => "");
}
check(last.includes("Слишком много попыток"), `после 10 неверных паролей: «${last.trim()}»`);
await guest.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
await guest.type("input[name=login]", "student1");
await guest.type("input[name=password]", process.env.SEED_PASSWORD_STUDENT1);
await guest.keyboard.press("Enter");
await guest.waitForSelector("[role=alert]", { timeout: 10000 }).catch(() => {});
check((await guest.$eval("[role=alert]", (a) => a.innerText).catch(() => "")).includes("Слишком много"), "во время блокировки не пускает и с верным паролем");
await db`delete from login_attempts`; // снимаем блокировку, чтобы не мешать другим проверкам

await closeStudent();
await browser.close();
await db.end();
console.log(failures ? `\nПровалено проверок: ${failures}` : "\nВсе действия пройдены");
process.exit(failures ? 1 : 0);
