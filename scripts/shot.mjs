// Скриншоты страниц на ширине 360 px и проверка горизонтальной прокрутки.
// Запуск: node scripts/shot.mjs <адрес сайта> <префикс файла> имя:/путь [имя:/путь ...]
// Пример: node scripts/shot.mjs http://localhost:3000 docs/screenshots/2026-11-08 login:/login today:/
// Войти перед съёмкой: переменные SHOT_LOGIN и SHOT_PASSWORD.
// Chromium: переменная CHROME_PATH или %LOCALAPPDATA%\Chromium\Application\chrome.exe.
import puppeteer from "puppeteer-core";
import path from "node:path";

const [base, prefix, ...pages] = process.argv.slice(2);
if (!base || !prefix || pages.length === 0) {
  console.error("Нужно: <адрес> <префикс> имя:/путь ...");
  process.exit(2);
}

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ??
    path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe"),
});
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

if (process.env.SHOT_LOGIN) {
  await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
  await page.type("input[name=login]", process.env.SHOT_LOGIN);
  await page.type("input[name=password]", process.env.SHOT_PASSWORD ?? "");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
}

let failed = false;
for (const item of pages) {
  const [name, route] = item.split(":");
  await page.goto(new URL(route, base).href, { waitUntil: "networkidle0" });
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  const file = `${prefix}-${name}.png`;
  await page.screenshot({ path: file });
  const ok = width <= 360;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "ШИРЕ"} ${route} ширина ${width} px -> ${file}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
