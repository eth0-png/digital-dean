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
  check(t.includes("эта неделя") && !t.includes("На этой неделе есть изменения") && !(await page.$('main a[href="/schedule"]')), `${tag}: эта неделя, без плашки об изменениях и без кнопки «Сегодня»`);

  await open('a[aria-label="Следующая неделя"]', "/schedule?date=");
  t = await text();
  check(t.includes("следующая неделя") && Boolean(await page.$('main a[href="/schedule"]')), `${tag}: следующая неделя, есть «Сегодня»`);
  await open('main a[href="/schedule"]', "/schedule", true);
  check((await where()) === "/schedule" && (await text()).includes("эта неделя"), `${tag}: «Сегодня» вернула текущую неделю`);

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

  // Подпись недели в одну строку: все недели учебного года с сентября по июнь, включая стыки месяцев и лет
  if (phone) {
    const wrapped = [];
    for (let d = Date.parse("2026-08-31T00:00:00Z"); d <= Date.parse("2027-06-28T00:00:00Z"); d += 7 * 86400000) {
      const date = new Date(d).toISOString().slice(0, 10);
      await page.goto(new URL(`/schedule?date=${date}`, base).href, { waitUntil: "networkidle0" });
      const r = await page.$eval('button[aria-label^="Выбрать неделю"] > span', (el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
        return { text: el.textContent.trim(), lines: Math.round(el.getBoundingClientRect().height / lh) };
      });
      if (r.lines > 1) wrapped.push(r.text);
    }
    check(wrapped.length === 0, `${tag}: подпись недели в одну строку на всех неделях с сентября по июнь${wrapped.length ? `, в две: ${wrapped.join("; ")}` : ""}`);
  }

  // Дата из календаря в той же неделе: переключается день (раньше адрес менялся, а день нет)
  await go("/schedule");
  const monday = await page.$eval('main input[type="date"]', (el) => el.defaultValue);
  const wed = new Date(Date.parse(`${monday}T00:00:00Z`) + 2 * 86400000).toISOString().slice(0, 10);
  await page.$eval('main input[type="date"]', (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, wed);
  await page.waitForFunction((v) => location.search.includes(v), { timeout: 8000 }, wed).catch(() => {});
  await settle();
  if (phone) {
    const h = await page.$eval("main section[aria-label] h2", (x) => x.textContent).catch(() => "");
    check(h.startsWith("Среда"), `${tag}: среда из календаря в той же неделе открыла среду («${h.trim()}»)`);
  }

  // Неделя сессии: вместо пар зачёты и экзамены
  await go("/schedule?date=2027-01-12");
  t = await page.evaluate(() => document.querySelector("main").innerText);
  check(t.includes("сессия") && t.includes("Финансовое право") && t.includes("экзамен") && !t.includes("лекция"), `${tag}: неделя сессии показывает экзамены, а не пары`);

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

    // Свайп по пустому фону: из субботы влево открывает следующую неделю с понедельника
    await page.$eval('main button[aria-label^="Суббота"]', (b) => b.scrollIntoView({ block: "center" }));
    await page.tap('main button[aria-label^="Суббота"]');
    await new Promise((r) => setTimeout(r, 400));
    const blank = await page.evaluate(() => {
      const r = document.querySelector("main section[aria-label]").getBoundingClientRect();
      return { x: innerWidth / 2, y: Math.min(r.bottom + 40, innerHeight - 140) };
    });
    const url = await where();
    await page.touchscreen.touchStart(blank.x + 120, blank.y);
    for (let k = 1; k <= 6; k++) await page.touchscreen.touchMove(blank.x + 120 - k * 45, blank.y + k);
    await page.touchscreen.touchEnd();
    await page.waitForFunction((u) => location.pathname + location.search !== u, { timeout: 8000 }, url).catch(() => {});
    await settle();
    const h = await page.$eval("main section[aria-label] h2", (x) => x.textContent).catch(() => "");
    check((await where()).startsWith("/schedule?date=") && h.startsWith("Понедельник"), `${tag}: свайп по пустому месту из субботы открыл следующую неделю («${h.trim()}», ${await where()})`);
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
