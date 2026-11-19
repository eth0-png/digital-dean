// Собирает PDF описания процесса из docs/process.html. Запуск из корня проекта: node scripts/process-pdf.mjs
// Сообщает число страниц и число незаполненных мест (жёлтые пометки class="todo").
import puppeteer from "puppeteer-core";
import path from "node:path";
import { pathToFileURL } from "node:url";

const src = path.resolve("docs/process.html");
const out = path.resolve("docs/process.pdf");
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe"),
});
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href, { waitUntil: "networkidle0" });
const state = await page.evaluate(() => ({
  broken: [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")),
  todo: [...document.querySelectorAll(".todo")].map((e) => e.textContent.trim()),
}));
const pdf = await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font:8px sans-serif;color:#777;padding:0 12mm;display:flex;justify-content:space-between"><span>Цифровой деканат. Концепт для конкурса, данные вымышлены</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
});
await browser.close();

const pages = (Buffer.from(pdf).toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`ok ${out}: ${pages} стр., ${(pdf.length / 1024 / 1024).toFixed(1)} МБ`);
if (state.broken.length) console.log(`ОШИБКА нет картинок: ${state.broken.join(", ")}`);
console.log(state.todo.length ? `Осталось заполнить (${state.todo.length}):\n- ${state.todo.join("\n- ")}` : "Незаполненных мест нет");
process.exit(state.broken.length ? 1 : 0);
