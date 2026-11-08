// Скриншоты страниц на ширине 360 px и проверка горизонтальной прокрутки.
// Запуск: node scripts/shot.mjs <адрес сайта> <префикс файла> имя:/путь [имя:/путь ...]
// Пример: node scripts/shot.mjs http://localhost:3000 docs/screenshots/2026-11-08 login:/login today:/
// Войти перед съёмкой: переменные SHOT_LOGIN и SHOT_PASSWORD.
// Chromium: переменная CHROME_PATH или %LOCALAPPDATA%\Chromium\Application\chrome.exe. Эмулятор Android: CHROME_REMOTE (scripts/browser.mjs).
import { openPage } from "./browser.mjs";

const [base, prefix, ...pages] = process.argv.slice(2);
if (!base || !prefix || pages.length === 0) {
  console.error("Нужно: <адрес> <префикс> имя:/путь ...");
  process.exit(2);
}

const { page, close } = await openPage();
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
  // Зоны касания меньше 44 px (кроме ссылок внутри текста, для них исключение в WCAG)
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("a, button, input, textarea, select, [role=radio], [role=button]")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const inline = el.tagName === "A" && getComputedStyle(el).display === "inline";
        // Радиокнопка внутри большой карточки-подписи: нажимается вся карточка
        const label = el.closest("label")?.getBoundingClientRect();
        const inBigLabel = label && label.height >= 44 && label.width >= 44;
        return r.width > 0 && r.height > 0 && !inline && !inBigLabel && (r.height < 44 || r.width < 44) && !el.closest("[aria-hidden=true]");
      })
      .map((el) => `${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24)} ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`),
  );
  const file = `${prefix}-${name}.png`;
  await page.screenshot({ path: file });
  const ok = width <= (await page.evaluate(() => innerWidth));
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "ШИРЕ"} ${route} ширина ${width} px -> ${file}`);
  if (small.length) console.log(`     меньше 44 px: ${small.join(", ")}`);
}
await close();
process.exit(failed ? 1 : 0);
