// Общий запуск браузера для скриптов проверки.
// По умолчанию локальный Chromium в режиме телефона 360 px.
// CHROME_REMOTE=http://127.0.0.1:9222: настоящий мобильный Chrome в эмуляторе Android (см. scripts/emulator.ps1).
// В эмуляторе один профиль браузера, поэтому перед входом куки стираются, а размер экрана не подменяется.
// Проверки с несколькими пользователями сразу (check-access, check-flow) в эмуляторе не запускаются.
import puppeteer from "puppeteer-core";
import path from "node:path";

export const remote = Boolean(process.env.CHROME_REMOTE);

export async function openPage() {
  if (remote) {
    // Работаем в видимой вкладке: фоновые вкладки Chrome на телефоне почти не отрисовывает,
    // а так на экране эмулятора видно, что делает проверка. Вкладки не закрываем: без них Chrome на Android выходит.
    const browser = await puppeteer.connect({ browserURL: process.env.CHROME_REMOTE, defaultViewport: null });
    const pages = await browser.pages();
    const visible = await Promise.all(pages.map((p) => p.evaluate(() => document.visibilityState === "visible").catch(() => false)));
    const page = pages[visible.indexOf(true)] ?? pages[0] ?? (await browser.newPage());
    const cdp = await page.createCDPSession();
    await cdp.send("Network.clearBrowserCookies");
    return { browser, page, close: async () => browser.disconnect() };
  }
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe"),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  return { browser, page, close: () => browser.close() };
}
