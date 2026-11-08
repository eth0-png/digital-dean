// Проход по разделу «Учёба» обоими студентами: все курсы и семестры, график, вкладки на телефоне, колонки на компьютере, «назад» браузера.
// На каждом шаге: нет горизонтальной прокрутки, ничего не вылезает за окно, кнопки от 44 px (телефон).
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
  // Вёрстка: прокрутка вбок, вылезающее за окно, мелкие кнопки на телефоне
  const inspect = async (step) => {
    await settle().catch(() => {});
    const bad = await page.evaluate((phone) => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth) out.push(`прокрутка вбок ${document.documentElement.scrollWidth} > ${innerWidth}`);
      for (const el of document.querySelectorAll("main *")) {
        if (el.closest(".sr-only, [aria-hidden=true]") || !el.getClientRects().length) continue;
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
      // Вкладки могут быть под нижним меню: как человек, сначала прокручиваем к ним
      await page.$eval(`[id="${id}"]`, (t) => t.scrollIntoView({ block: "center" }));
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
    // Свайп по списку: вправо предыдущая вкладка, влево следующая (сейчас открыта последняя)
    const swipe = async (from, to) => {
      const box = await page.evaluate(() => {
        const p = [...document.querySelectorAll("main [role=tabpanel]")].find((x) => x.getClientRects().length);
        p.scrollIntoView({ block: "center" });
        const r = p.getBoundingClientRect();
        return { x: r.left, w: r.width, y: Math.min(r.top + 60, innerHeight - 150) };
      });
      await page.touchscreen.touchStart(box.x + box.w * from, box.y);
      for (let k = 1; k <= 6; k++) await page.touchscreen.touchMove(box.x + box.w * (from + ((to - from) * k) / 6), box.y + k);
      await page.touchscreen.touchEnd();
      await new Promise((r) => setTimeout(r, 400));
      return page.evaluate(() => [...document.querySelectorAll("main [role=tab]")].find((t) => t.getClientRects().length && t.getAttribute("aria-selected") === "true")?.id);
    };
    if (size) return; // окно компьютера с мышью: свайпа пальцем там нет
    const back = await swipe(0.2, 0.85);
    const fwd = await swipe(0.85, 0.2);
    const stay = (await where()).startsWith("/study");
    check(back === ids[0] && fwd === ids[1] && stay, `${tag} ${login} ${step}: свайп вправо открыл первую вкладку, влево вторую${stay ? "" : ", но браузер ушёл со страницы"}`);
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
  const main = () => page.evaluate(() => document.querySelector("main").innerText);
  const selected = () => page.$eval("nav[aria-label=Семестры] a[aria-current=page]", (a) => ({ href: a.getAttribute("href"), name: a.textContent.trim() })).catch(() => null);
  const start = await selected();
  const text = await main();
  check(start?.href === "/study" && start.name.includes("сейчас") && text.includes("средний балл"), `${tag} ${login}: открыт текущий семестр («${start?.name}»), крупно средний балл`);
  const courses = await page.$$eval("nav[aria-label=Курсы] a", (as) => as.map((a) => ({ href: a.getAttribute("href"), name: a.textContent.trim() })));
  const future = await page.$$eval("nav[aria-label=Семестры] [aria-disabled=true]", (n) => n.map((x) => x.tagName));
  check(future.every((t) => t !== "A"), `${tag} ${login}: не начавшийся семестр не открывается (${future.length ? "есть, не ссылка" : "нет"})`);
  await tabs("текущий семестр");

  // Шапка поверх содержимого: прокручиваем так, чтобы вкладки ушли под неё, и смотрим, что в её середине
  const covered = await page.evaluate(async () => {
    const header = document.querySelector("header");
    const list = [...document.querySelectorAll("main [role=tablist]")].find((l) => l.getClientRects().length);
    if (!header || !list) return "нет";
    const h = header.getBoundingClientRect();
    scrollBy(0, list.getBoundingClientRect().top - (h.top + h.height / 2) + 10);
    await new Promise((r) => setTimeout(r, 200));
    const r = list.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, h.top + h.height / 2);
    scrollTo(0, 0);
    return el?.closest("header") ? "шапка" : `${el?.textContent?.trim().slice(0, 20)}`;
  });
  check(covered === "шапка" || covered === "нет", `${tag} ${login}: вкладки при прокрутке уходят под шапку (сверху: ${covered})`);

  // Статистика: кнопка в карточке открывает шторку с графиком, семестрами и оценками
  await page.$eval("button[data-stats]", (b) => b.scrollIntoView({ block: "center" }));
  await settle().catch(() => {});
  await press("button[data-stats]");
  const sheet = await page
    .waitForSelector("[role=dialog]", { timeout: 8000 })
    .then(() => settle().catch(() => {}))
    .then(() =>
      page.evaluate(() => {
        const d = document.querySelector("[role=dialog]");
        return { title: d.querySelector("h2")?.textContent, chart: Boolean(d.querySelector("svg[role=img]")), sems: d.querySelectorAll("li a").length, letters: d.querySelectorAll("section:last-child li").length };
      }),
    )
    .catch((e) => (console.log("stats:", e.message.slice(0, 200)), null));
  check(
    sheet?.title === "Успеваемость" && sheet.sems === (courses.length ? sheet.sems : 1) && sheet.sems > 0 && sheet.letters > 0 && sheet.chart === courses.length > 0,
    `${tag} ${login}: статистика открыта (график ${sheet?.chart ? "есть" : "нет"}, семестров ${sheet?.sems}, строк оценок ${sheet?.letters})`,
  );
  await page.screenshot({ path: path.join(out, `${tag}-${login}-stats.png`) });
  await page.keyboard.press("Escape");
  await page.waitForSelector("[role=dialog]", { hidden: true, timeout: 8000 }).catch(() => {});
  await settle().catch(() => {});

  // Каждый курс, в нём каждый семестр. Курс открывает свой первый (левый) семестр
  const visited = ["/study"];
  const open = async (sel, href, what) => {
    await page.$eval(sel, (a) => a.scrollIntoView({ block: "center" }));
    await settle().catch(() => {});
    await press(sel);
    await page.waitForFunction((h) => location.pathname + location.search === h, { timeout: 8000 }, href).catch(() => {});
    await settle().catch(() => {});
    visited.push(href);
    const sem = await selected();
    const t = await main();
    const current = href === "/study";
    check(
      (await where()) === href && sem?.href === href && t.includes("средний балл") && (current ? /Долгов нет|незачёт/.test(t) : /сданы|несданные/.test(t)),
      `${tag} ${login}: ${what} → «${sem?.name}» открыт и выбран`,
    );
    await tabs(sem?.name ?? href);
  };
  for (const c of courses) {
    await open(`nav[aria-label=Курсы] a[href="${c.href}"]`, c.href, c.name);
    const on = await page.$eval("nav[aria-label=Курсы] a[aria-current]", (a) => a.textContent.trim()).catch(() => "");
    check(on === c.name, `${tag} ${login}: выбран «${c.name}»`);
    const rest = await page.$$eval("nav[aria-label=Семестры] a:not([aria-current])", (as) => as.map((a) => a.getAttribute("href")));
    for (const href of rest) await open(`nav[aria-label=Семестры] a[href="${href}"]`, href, "семестр");
  }

  // «Назад» браузера возвращает предыдущий семестр (с вкладкой, выбранной в нём), а не уводит из раздела
  if (visited.length < 2) return;
  const before = visited.at(-2);
  await page.goBack({ waitUntil: "networkidle0" }).catch(() => {});
  await settle().catch(() => {});
  const back = { url: await where(), sem: await selected() };
  check(back.url.startsWith(before) && back.sem?.href === before, `${tag} ${login}: «назад» браузера вернул ${before} (${back.url})`);

  // Семестр из шторки статистики: открывается, шторка закрывается
  await page.goto(new URL("/study", base).href, { waitUntil: "networkidle0" });
  await settle().catch(() => {});
  await page.$eval("button[data-stats]", (b) => b.scrollIntoView({ block: "center" }));
  await press("button[data-stats]");
  await page.waitForSelector("[role=dialog] li a", { timeout: 8000 });
  await settle().catch(() => {});
  const target = await page.$$eval("[role=dialog] li a", (as) => as.at(-1).getAttribute("href"));
  await page.$eval(`[role=dialog] li a[href="${target}"]`, (a) => a.scrollIntoView({ block: "center" }));
  await press(`[role=dialog] li a[href="${target}"]`);
  await page.waitForFunction((h) => location.pathname + location.search === h, { timeout: 8000 }, target).catch(() => {});
  await page.waitForSelector("[role=dialog]", { hidden: true, timeout: 8000 }).catch(() => {});
  check((await where()) === target && !(await page.$("[role=dialog]")) && (await selected())?.href === target, `${tag} ${login}: семестр из статистики открыт (${target}), шторка закрыта`);
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
