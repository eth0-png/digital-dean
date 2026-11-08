// Проход по разделу «Учёба» обоими студентами: все семестры, вкладки на телефоне, колонки на компьютере, «назад» браузера.
// На каждом шаге: нет горизонтальной прокрутки, ничего не вылезает за окно, выбранный семестр виден, кнопки от 44 px (телефон).
// Только чтение, можно на боевом сайте.
// Телефон: node scripts/check-study.mjs <адрес> <папка для снимков>   (с CHROME_REMOTE идёт в Chrome эмулятора Android)
// Компьютер: SIZES=1024x768,1440x900 node scripts/check-study.mjs <адрес> <папка>
// Пароли из SEED_PASSWORD_STUDENT1 и SEED_PASSWORD_STUDENT2.
import puppeteer from "puppeteer-core";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { openPage, remote } from "./browser.mjs";

const [base, out = "study-shots"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const sizes = process.env.SIZES ? process.env.SIZES.split(",").map((s) => s.split("x").map(Number)) : [null];
let failures = 0;
const check = (ok, text) => {
  console.log(`${ok ? "ok    " : "ОШИБКА"} ${text}`);
  if (!ok) failures++;
};

async function run(page, size, login, password) {
  const tag = size ? `${size[0]}x${size[1]}` : remote ? "android" : "phone";
  const phone = !size || size[0] < 1024;
  // Телефон касанием, окно компьютера мышью (и узкое тоже)
  const press = (sel) => (size ? page.click(sel) : page.tap(sel));
  const settle = () =>
    page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity), {
      timeout: 10000,
    });
  const where = () => page.evaluate(() => location.pathname + location.search);
  let shot = 0;
  // Вёрстка: прокрутка вбок, вылезающее за окно (кроме прокручиваемой ленты семестров), мелкие кнопки на телефоне
  const inspect = async (step) => {
    await settle().catch(() => {});
    const bad = await page.evaluate((phone) => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth) out.push(`прокрутка вбок ${document.documentElement.scrollWidth} > ${innerWidth}`);
      for (const el of document.querySelectorAll("main *")) {
        if (el.closest(".sr-only, [aria-hidden=true], nav[aria-label=Семестры]") || !el.getClientRects().length) continue;
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > innerWidth + 1 || r.left < -1)) out.push(`за окном: ${(el.textContent || el.tagName).trim().slice(0, 30)}`);
        if (phone && el.matches("a, button, [role=tab]") && getComputedStyle(el).display !== "inline" && (r.height < 44 || r.width < 44))
          out.push(`меньше 44 px: ${el.textContent.trim().slice(0, 24)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      return [...new Set(out)].slice(0, 5);
    }, phone);
    check(bad.length === 0, `${tag} ${login} ${step}${bad.length ? ": " + bad.join("; ") : ""}`);
    await page.screenshot({ path: path.join(out, `${tag}-${login}-${String(++shot).padStart(2, "0")}.png`) });
  };
  // Вкладки на телефоне: каждая открывается, в ней есть строки, выбор в адресе
  const tabs = async (step) => {
    if (!phone) {
      const cols = await page.$$eval("main section h2", (hs) => hs.filter((h) => h.getClientRects().length).map((h) => h.textContent.trim()));
      const visibleTabs = await page.$$eval("main [role=tab]", (ts) => ts.filter((t) => t.getClientRects().length).length);
      check(cols.length >= 2 && visibleTabs === 0, `${tag} ${login} ${step}: обе части рядом (${cols.join(", ")}), вкладок нет`);
      return inspect(step);
    }
    const ids = await page.$$eval("main [role=tab]", (ts) => ts.filter((t) => t.getClientRects().length).map((t) => t.id));
    check(ids.length === 2, `${tag} ${login} ${step}: две вкладки`);
    // Сразу после смены семестра, до нажатий: выбрана вкладка из адреса или первая, в ней строки, подложка под ней
    const st = await page.evaluate(() => {
      const list = [...document.querySelectorAll("main [role=tablist]")].find((l) => l.getClientRects().length);
      const tabs = [...list.querySelectorAll("[role=tab]")];
      const active = tabs.find((t) => t.getAttribute("aria-selected") === "true");
      const panel = active && document.getElementById(active.getAttribute("aria-controls"));
      const pill = list.querySelector(":scope > span[aria-hidden=true]")?.getBoundingClientRect();
      const r = active?.getBoundingClientRect();
      const want = new URLSearchParams(location.search).get("tab");
      return {
        name: active?.textContent.trim() ?? "нет",
        fromUrl: want ? active?.id.endsWith(`-trigger-${want}`) : active === tabs[0],
        rows: panel?.querySelectorAll("li").length ?? 0,
        pill: Boolean(pill && r && Math.abs(pill.left - r.left) < 3 && Math.abs(pill.width - r.width) < 3),
      };
    });
    check(st.fromUrl && st.rows > 0 && st.pill, `${tag} ${login} ${step}: сразу открыта «${st.name}», строк ${st.rows}, подложка ${st.pill ? "на месте" : "не под ней"}`);
    for (const [i, id] of ids.entries()) {
      await press(`[id="${id}"]`);
      await page.waitForFunction((id) => document.getElementById(id)?.getAttribute("aria-selected") === "true", { timeout: 5000 }, id).catch(() => {});
      const info = await page.evaluate((id) => {
        const t = document.getElementById(id);
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        return { name: t.textContent.trim(), selected: t.getAttribute("aria-selected") === "true", rows: panel?.querySelectorAll("li").length ?? 0, url: location.search };
      }, id);
      // Первая вкладка по умолчанию в адрес не пишется, остальные пишутся (?tab=)
      const inUrl = info.url.includes("tab=");
      check(info.selected && info.rows > 0 && (i === 0 ? !inUrl : inUrl), `${tag} ${login} ${step}: вкладка «${info.name}» открыта, строк ${info.rows}, адрес ${info.url || "без вкладки"}`);
      await inspect(`${step}, ${info.name}`);
    }
  };

  await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
  await page.type("input[name=login]", login);
  await page.type("input[name=password]", password);
  // Отправляем клавишей Enter: в Chrome эмулятора нажатие puppeteer по кнопке «Войти» иногда не доходит (палец через adb работает).
  // После входа Next переходит без полной перезагрузки, поэтому ждём смену адреса, а не навигацию
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.pathname !== "/login", { timeout: 20000 });
  await page.goto(new URL("/study", base).href, { waitUntil: "networkidle0" });
  await settle();
  const sems = await page.$$eval("nav[aria-label=Семестры] a", (as) => as.map((a) => ({ href: a.getAttribute("href"), name: a.textContent.trim(), now: a.hasAttribute("aria-current") })));
  check(sems.length > 0 && sems[0].now && sems[0].name.includes("сейчас"), `${tag} ${login}: открыт текущий семестр («${sems[0]?.name}»), всего ${sems.length}`);
  check((await page.evaluate(() => document.body.innerText)).includes("Как дела"), `${tag} ${login}: сводка «Как дела» на месте`);
  await tabs("текущий семестр");

  for (const s of sems.slice(1).concat(sems[0])) {
    const sel = `nav[aria-label=Семестры] a[href="${s.href}"]`;
    await page.$eval(sel, (a) => a.scrollIntoView({ block: "nearest", inline: "nearest" }));
    await press(sel);
    await page.waitForFunction((h) => location.pathname + location.search === h, { timeout: 8000 }, s.href).catch(() => {});
    await settle().catch(() => {});
    const st = await page.evaluate((sel) => {
      const a = document.querySelector(sel);
      const r = a.getBoundingClientRect();
      return { current: a.getAttribute("aria-current") === "page", inView: r.left >= -1 && r.right <= innerWidth + 1, text: document.querySelector("main").innerText };
    }, sel);
    const past = !s.now;
    check(
      (await where()) === s.href && st.current && st.inView && st.text.includes(past ? "Рейтинг за семестр" : "Как дела"),
      `${tag} ${login}: «${s.name}» открыт, выбран, виден целиком, ${past ? "рейтинг" : "сводка"} на месте`,
    );
    await tabs(s.name);
  }

  // «Назад» браузера возвращает предыдущий семестр, а не уводит из раздела
  // Вкладка, выбранная в том семестре, тоже возвращается: она хранится в адресе
  if (sems.length < 2) return;
  const before = sems.at(-1).href;
  await page.goBack({ waitUntil: "networkidle0" }).catch(() => {});
  await settle().catch(() => {});
  const back = await page.evaluate(() => ({
    url: location.pathname + location.search,
    current: document.querySelector("nav[aria-label=Семестры] a[aria-current=page]")?.getAttribute("href"),
  }));
  check(back.url.startsWith(before) && back.current === before, `${tag} ${login}: «назад» браузера вернул «${sems.at(-1).name}» (${back.url})`);
}

const accounts = [
  ["student1", process.env.SEED_PASSWORD_STUDENT1],
  ["student2", process.env.SEED_PASSWORD_STUDENT2],
];
for (const size of sizes) {
  for (const [login, password] of accounts) {
    if (size) {
      const browser = await puppeteer.launch({
        executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe"),
        ignoreDefaultArgs: ["--hide-scrollbars"],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: size[0], height: size[1] });
      await run(page, size, login, password);
      await browser.close();
    } else {
      // Телефон: эмулятор (один профиль, openPage стирает куки) или локальный Chromium 360 px
      const { page, close } = await openPage();
      await run(page, null, login, password);
      await close();
    }
  }
}
console.log(failures ? `\nПровалено проверок: ${failures}` : "\nРаздел «Учёба» пройден");
process.exit(failures ? 1 : 0);
