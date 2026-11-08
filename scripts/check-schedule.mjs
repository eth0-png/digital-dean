// Проход по «Расписанию»: недели стрелками, «Перейти к текущей неделе», год у недель другого года, выбор даты в календаре,
// свайп по дням на телефоне (и браузер не уходит «назад»), без плашки об изменениях. Только чтение, можно на боевом сайте.
// Телефон: node scripts/check-schedule.mjs <адрес>   (с CHROME_REMOTE в Chrome эмулятора Android)
// Компьютер: SIZES=1366x768 node scripts/check-schedule.mjs <адрес>
// Пароль из SEED_PASSWORD_STUDENT1.
import puppeteer from "puppeteer-core";
import path from "node:path";
import { openPage } from "./browser.mjs";

const base = process.argv[2];
const sizes = process.env.SIZES ? process.env.SIZES.split(",").map((s) => s.split("x").map(Number)) : [null];
let failures = 0;
const check = (ok, text) => {
  console.log(`${ok ? "ok    " : "ОШИБКА"} ${text}`);
  if (!ok) failures++;
};

async function run(page, size) {
  const tag = size ? `${size[0]}x${size[1]}` : process.env.CHROME_REMOTE ? "android" : "phone";
  const phone = !size || size[0] < 1024;
  const press = (sel) => (size ? page.click(sel) : page.tap(sel));
  const settle = () =>
    page
      .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity), { timeout: 10000 })
      .catch(() => {});
  const where = () => page.evaluate(() => location.pathname + location.search);
  const text = () => page.evaluate(() => document.querySelector("main").innerText);
  const go = async (p) => {
    await page.goto(new URL(p, base).href, { waitUntil: "networkidle0" });
    await settle();
  };
  const open = async (sel, want, exact = false) => {
    await page.$eval(sel, (a) => a.scrollIntoView({ block: "center" }));
    await settle();
    await press(sel);
    await page
      .waitForFunction((w, e) => (e ? location.pathname + location.search === w : (location.pathname + location.search).startsWith(w)), { timeout: 8000 }, want, exact)
      .catch(() => {});
    await settle();
  };

  await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
  await page.type("input[name=login]", "student1");
  await page.type("input[name=password]", process.env.SEED_PASSWORD_STUDENT1);
  await page.keyboard.press("Enter"); // в Chrome эмулятора нажатие по «Войти» иногда не доходит
  await page.waitForFunction(() => location.pathname !== "/login", { timeout: 20000 });

  await go("/schedule");
  let t = await text();
  check(t.includes("эта неделя") && !t.includes("На этой неделе есть изменения") && !t.includes("Перейти к текущей неделе"), `${tag}: эта неделя, без плашки об изменениях и без кнопки возврата`);

  await open('a[aria-label="Следующая неделя"]', "/schedule?date=");
  t = await text();
  check(t.includes("следующая неделя") && t.includes("Перейти к текущей неделе"), `${tag}: следующая неделя, есть «Перейти к текущей неделе»`);
  await open('main a[href="/schedule"]', "/schedule", true);
  check((await where()) === "/schedule" && (await text()).includes("эта неделя"), `${tag}: «Перейти к текущей неделе» вернула текущую`);

  // Неделя другого года: год в подписи
  await go("/schedule?date=2027-01-12");
  const range = await page.$eval('button[aria-label^="Выбрать неделю"]', (b) => b.innerText.replace(/\s+/g, " ").trim());
  check(/2027/.test(range), `${tag}: у недели другого года есть год («${range}»)`);

  // Календарь: поле даты есть, выбор даты открывает её неделю (сам системный календарь автоматизацией не нажать)
  await go("/schedule");
  const picked = "2026-12-02";
  await page.$eval('main input[type="date"]', (el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, picked);
  await page.waitForFunction((v) => location.search.includes(v), { timeout: 8000 }, picked).catch(() => {});
  await settle();
  check((await where()).includes(picked) && (await text()).includes("декабря"), `${tag}: выбор ${picked} в календаре открыл его неделю (${await where()})`);

  // Свайп по парам листает дни (только пальцем, на телефоне)
  if (!size && phone) {
    await go("/schedule");
    const day = () => page.$eval("main section[aria-label] h2", (h) => h.textContent.trim()).catch(() => "");
    const before = await day();
    const swipe = async (from, to) => {
      const box = await page.evaluate(() => {
        const s = document.querySelector("main section[aria-label]");
        s.scrollIntoView({ block: "center" });
        const r = s.getBoundingClientRect();
        return { x: r.left, w: r.width, y: Math.min(r.top + 80, innerHeight - 150) };
      });
      await page.touchscreen.touchStart(box.x + box.w * from, box.y);
      for (let k = 1; k <= 6; k++) await page.touchscreen.touchMove(box.x + box.w * (from + ((to - from) * k) / 6), box.y + k);
      await page.touchscreen.touchEnd();
      await new Promise((r) => setTimeout(r, 400));
      return day();
    };
    const next = await swipe(0.85, 0.15);
    const back = await swipe(0.15, 0.85);
    const stay = (await where()).startsWith("/schedule");
    check(next && next !== before && back === before && stay, `${tag}: свайп по парам: «${before}» → «${next}» → «${back}»${stay ? "" : ", но браузер ушёл со страницы"}`);
  }
}

for (const size of sizes) {
  if (size) {
    const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe") });
    const page = await browser.newPage();
    await page.setViewport({ width: size[0], height: size[1] });
    await run(page, size);
    await browser.close();
  } else {
    const { page, close } = await openPage();
    await run(page, null);
    await close();
  }
}
console.log(failures ? `\nПровалено проверок: ${failures}` : "\nРаздел «Расписание» пройден");
process.exit(failures ? 1 : 0);
