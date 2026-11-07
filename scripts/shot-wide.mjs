// Скриншоты на широком экране (по умолчанию 1440×900), пара к shot.mjs для телефона.
// Запуск: SHOT_LOGIN=... SHOT_PASSWORD=... node scripts/shot-wide.mjs <адрес> <префикс> имя:/путь[:кнопка] ...
// Если после пути указана подпись кнопки, она нажимается перед снимком (например, открыть переписку).
import puppeteer from "puppeteer-core";
import path from "node:path";

const [base, prefix, ...pages] = process.argv.slice(2);
const [width, height] = (process.env.SHOT_SIZE ?? "1440x900").split("x").map(Number);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe"),
});
const page = await browser.newPage();
await page.setViewport({ width, height });
const settle = () =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity));

if (process.env.SHOT_LOGIN) {
  await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
  await page.type("input[name=login]", process.env.SHOT_LOGIN);
  await page.type("input[name=password]", process.env.SHOT_PASSWORD ?? "");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
}

for (const item of pages) {
  const [name, url, button] = item.split(":");
  await page.goto(new URL(url, base).href, { waitUntil: "networkidle0" });
  await settle();
  if (button) {
    await page.locator(`button::-p-text(${button})`).click();
    await page.waitForSelector("[role=dialog]");
    await settle();
  }
  await new Promise((r) => setTimeout(r, 300));
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const file = `${prefix}-${name}.png`;
  await page.screenshot({ path: file });
  console.log(`${scroll ? "ГОРИЗОНТАЛЬНАЯ ПРОКРУТКА" : "ok"}   ${url} ${width}×${height} -> ${file}`);
}
await browser.close();
