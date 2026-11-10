// Lighthouse по страницам кабинета: скорость, доступность, лучшие практики, в режимах телефона и компьютера.
// Страницы за входом открываются с кукой сессии, которую скрипт получает, входя через форму.
// Lighthouse в проект не ставится: npm i lighthouse@12 --prefix "%TEMP%/claude/lh" (или путь в LIGHTHOUSE_DIR).
// Запуск: SEED_PASSWORD_STUDENT1=... SEED_PASSWORD_STAFF=... node scripts/lighthouse.mjs <адрес> <папка для отчётов>
import puppeteer from "puppeteer-core";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const chrome = path.join(process.env.LOCALAPPDATA, "Chromium/Application/chrome.exe");
const lh = path.join(process.env.LIGHTHOUSE_DIR ?? path.join(process.env.TEMP, "claude/lh"), "node_modules/lighthouse/cli/index.js");
const browser = await puppeteer.launch({ executablePath: chrome });
async function cookie(login, password) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.goto(new URL("/login", base).href, { waitUntil: "networkidle0" });
  await page.type("input[name=login]", login);
  await page.type("input[name=password]", password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
  const c = (await page.cookies()).find((c) => c.name.endsWith("session"));
  const appHref = await page.goto(new URL("/documents/all", base).href, { waitUntil: "networkidle0" }).then(() => page.evaluate(() => [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")).find((h) => /^\/(documents|staff)\/[0-9a-f-]{36}$/.test(h ?? ""))));
  return { header: `${c.name}=${c.value}`, appHref };
}
const s = await cookie("student1", process.env.SEED_PASSWORD_STUDENT1);
const st = await cookie("dekanat", process.env.SEED_PASSWORD_STAFF);
await browser.close();
const pages = [["login", "/login", null], ["today", "/", s.header], ["schedule", "/schedule", s.header], ["study", "/study", s.header], ["documents", "/documents", s.header], ["application", s.appHref, s.header], ["notifications", "/notifications", s.header], ["profile", "/profile", s.header], ["staff", "/staff", st.header]];
const rows = [];
for (const mode of ["mobile", "desktop"]) {
  for (const [name, route, ck] of pages) {
    const file = path.join(out, `${mode}-${name}.json`);
    const args = [lh, new URL(route, base).href, "--quiet", "--output=json", `--output-path=${file}`, "--only-categories=performance,accessibility,best-practices", "--chrome-flags=--headless=new"];
    if (mode === "desktop") args.push("--preset=desktop");
    if (ck) args.push(`--extra-headers=${JSON.stringify({ Cookie: ck })}`);
    try { execFileSync(process.execPath, args, { stdio: "ignore", timeout: 150000, env: { ...process.env, CHROME_PATH: chrome } }); } catch (e) { console.log(`${mode} ${name}: ошибка запуска ${e.message.slice(0, 120)}`); continue; }
    const r = JSON.parse(readFileSync(file, "utf8"));
    const sc = (k) => Math.round((r.categories[k]?.score ?? 0) * 100);
    const failed = Object.values(r.audits).filter((a) => a.score !== null && a.score < 1 && r.categories.accessibility.auditRefs.some((x) => x.id === a.id && x.weight > 0)).map((a) => a.id);
    const m = (id) => r.audits[id]?.displayValue ?? "";
    rows.push(`${mode.padEnd(7)} ${name.padEnd(13)} скорость ${sc("performance")}  доступность ${sc("accessibility")}  практики ${sc("best-practices")}  LCP ${m("largest-contentful-paint")}  CLS ${m("cumulative-layout-shift")}  TBT ${m("total-blocking-time")}${failed.length ? `  [a11y: ${failed.join(", ")}]` : ""}`);
    console.log(rows.at(-1));
  }
}
