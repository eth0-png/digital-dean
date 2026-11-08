// Проверка отрисовки в разных размерах окна браузера на компьютере: от большого монитора до половины экрана
// и низкого окна. Студент, сотрудник и общие экраны. Ищет горизонтальную прокрутку, обрезанный текст
// и вылезающие за окно элементы, скачок бокового меню между страницами, снимает каждую страницу в папку для просмотра глазами.
// Только чтение: ничего не создаёт, можно запускать на боевом сайте.
// Запуск: SEED_PASSWORD_STUDENT1=... SEED_PASSWORD_STUDENT2=... SEED_PASSWORD_STAFF=... node scripts/check-sizes.mjs <адрес> <папка для снимков>
import puppeteer from "puppeteer-core";
import path from "node:path";
import { mkdirSync } from "node:fs";

const [base, out = "check-sizes"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// Ширина × высота: полный экран, ноутбуки с масштабом, граница двух раскладок (1024 и 1023), половина экрана, низкое окно
const SIZES = (process.env.SIZES ?? "2560x1440,1920x1080,1536x864,1366x768,1280x720,1024x768,1023x768,800x600,1440x500").split(",");

// Полоса прокрутки как в обычном окне: без неё не видно скачка раскладки между короткими и длинными страницами
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe"),
  ignoreDefaultArgs: ["--hide-scrollbars"],
});
const menuX = {}; // где стоит боковое меню студента на каждой странице, по размерам окна
let problems = 0;

async function session(login, password) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (login) {
    await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
    await page.type("input[name=login]", login);
    await page.type("input[name=password]", password);
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
  }
  return page;
}

// Ссылки на конкретные заявки берём из интерфейса, а не из базы
async function firstHref(page, from, pattern) {
  await page.goto(new URL(from, base).href, { waitUntil: "networkidle0" });
  return page.evaluate((p) => [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")).find((h) => new RegExp(p).test(h ?? "")), pattern);
}

async function inspect(page, who, route, size) {
  const [w, h] = size.split("x").map(Number);
  await page.setViewport({ width: w, height: h });
  await page.goto(new URL(route, base).href, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.querySelector("[aria-busy=true]"), { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity));
  const found = await page.evaluate(() => {
    const issues = [];
    if (document.documentElement.scrollWidth > innerWidth) issues.push(`горизонтальная прокрутка ${document.documentElement.scrollWidth} > ${innerWidth}`);
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden" || el.closest("[aria-hidden=true]")) continue;
      // Скрытое для глаз намеренно (ссылка «Перейти к содержимому» до нажатия Tab) и содержимое прокручиваемых лент (карусель)
      if (el.closest(".sr-only")) continue;
      let scroller = el.parentElement;
      while (scroller && !["auto", "scroll"].includes(getComputedStyle(scroller).overflowX)) scroller = scroller.parentElement;
      if (scroller) continue;
      // Видимый элемент вылезает за правый край окна
      if (r.right > innerWidth + 1 && getComputedStyle(el).position !== "fixed") issues.push(`за краем окна: ${el.tagName.toLowerCase()} «${(el.textContent ?? "").trim().slice(0, 30)}»`);
      // Текст обрезан: содержимое шире блока, а прокрутки у блока нет (кроме намеренной прокрутки и line-clamp)
      const cs = getComputedStyle(el);
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== "auto" && cs.overflowX !== "scroll" && el.textContent.trim() && !cs.webkitLineClamp.match(/\d/))
        issues.push(`обрезан текст: «${el.textContent.trim().slice(0, 30)}»`);
    }
    return [...new Set(issues)].slice(0, 5);
  });
  const x = await page.evaluate(() => {
    const a = document.querySelector("aside");
    return a && a.getBoundingClientRect().width ? Math.round(a.getBoundingClientRect().left) : null;
  });
  if (x !== null && who.startsWith("student")) (menuX[size] ??= new Set()).add(x);
  const file = path.join(out, `${size}-${who}-${route.replace(/[/?=]+/g, "_").replace(/^_|_$/g, "") || "home"}.png`);
  await page.screenshot({ path: file });
  if (found.length) {
    problems += found.length;
    console.log(`ПРОВЕРИТЬ ${size} ${who} ${route}: ${found.join("; ")}`);
  }
}

const student = await session("student1", process.env.SEED_PASSWORD_STUDENT1);
const student2 = await session("student2", process.env.SEED_PASSWORD_STUDENT2);
const staff = await session("dekanat", process.env.SEED_PASSWORD_STAFF);
const anon = await session();

const app = (await firstHref(student, "/documents/all", "^/documents/[0-9a-f-]{36}$")) ?? "/documents";
const doc = (await firstHref(student, "/documents/all", "^/documents/[0-9a-f-]{36}$").then(async () => {
  // Готовая справка: ищем среди заявок ссылку «Открыть справку»
  const all = await student.evaluate(() => [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")).filter((h) => /^\/documents\/[0-9a-f-]{36}$/.test(h ?? "")));
  for (const a of all) {
    const d = await firstHref(student, a, "/document$");
    if (d) return d;
  }
  return null;
})) ?? app;
const card = (await firstHref(staff, "/staff", "^/staff/[0-9a-f-]{36}$")) ?? "/staff";

const PAGES = [
  [student, "student", ["/", "/schedule", "/study", "/study?sem=4", "/documents", "/documents/all", "/documents/new?type=study", app, doc, "/notifications", "/profile"]],
  [student2, "student2", ["/", "/study"]],
  [staff, "staff", ["/staff", card]],
  [anon, "public", ["/login", "/nonexistent"]],
];

for (const size of SIZES) {
  for (const [page, who, routes] of PAGES) for (const route of routes) await inspect(page, who, route, size);
  // Боковое меню не должно прыгать при переходе между разделами (короткие страницы без полосы прокрутки, длинные с ней)
  if (menuX[size]?.size > 1) {
    problems++;
    console.log(`ПРОВЕРИТЬ ${size}: боковое меню прыгает между страницами: ${[...menuX[size]].join(", ")} px`);
  }
  console.log(`ok    ${size} снято`);
}

await browser.close();
console.log(problems ? `\nНайдено мест для проверки: ${problems}. Снимки: ${out}` : `\nПроблем не найдено. Снимки для просмотра глазами: ${out}`);
process.exit(problems ? 1 : 0);
