// Замер плавности переключения вкладок нижнего меню: процессор замедлен в 4 раза (как средний телефон),
// считаем кадры дольше 33 мс (заметный рывок) и длинные кадры анимации браузера.
// Запуск: SHOT_LOGIN=student1 SHOT_PASSWORD=... node scripts/measure-nav.mjs <адрес>
// REDUCED=1 включает «уменьшение движения»: сравнить, сколько рывков даёт сама отрисовка без анимаций.
import { openPage, remote } from "./browser.mjs";

const base = process.argv[2];
const { page, close } = await openPage();
await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
await page.type("input[name=login]", process.env.SHOT_LOGIN);
await page.type("input[name=password]", process.env.SHOT_PASSWORD);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
// В эмуляторе меряем как есть, на локальном Chromium замедляем процессор в 4 раза, как у среднего телефона
if (!remote) await page.emulateCPUThrottling(4);
if (process.env.REDUCED) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

const tabs = ["/schedule", "/study", "/documents", "/"];
const rows = [];
for (let round = 0; round < 2; round++) {
  for (const href of tabs) {
    await new Promise((r) => setTimeout(r, 900));
    await page.evaluate(() => {
      window.__f = [];
      window.__loaf = [];
      const loop = (t) => { window.__f.push(t); if (window.__f.length < 200) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      // Один наблюдатель на замер: прежний отключаем, иначе кадры считаются по нескольку раз
      window.__obs?.disconnect();
      window.__obs = new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__loaf.push(e.duration)));
      window.__obs.observe({ type: "long-animation-frame" });
    });
    const t0 = Date.now();
    await page.tap(`nav:not(aside *) a[href="${href}"]`); // нижнее меню, боковое на телефоне скрыто
    await page.waitForFunction((h) => location.pathname === h, {}, href);
    await new Promise((r) => setTimeout(r, 1000));
    const { frames, loaf } = await page.evaluate(() => ({ frames: window.__f, loaf: window.__loaf }));
    const d = frames.slice(1).map((t, i) => t - frames[i]).filter((x) => x < 1000);
    rows.push({ href, jank: d.filter((x) => x > 33).length, max: Math.round(Math.max(...d)), loaf: loaf.filter((x) => x > 50).length, ms: Date.now() - t0 });
  }
}
await close();
const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
for (const r of rows) console.log(`${r.href.padEnd(11)} рывков ${String(r.jank).padStart(2)}  самый долгий кадр ${String(r.max).padStart(4)} мс  длинных кадров ${r.loaf}`);
console.log(`Итого: рывков ${sum("jank")}, длинных кадров ${sum("loaf")}, самый долгий кадр ${Math.max(...rows.map((r) => r.max))} мс`);
