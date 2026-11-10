// Проверка разделения доступа: каждый видит только своё, чужие разделы не открываются.
// Запуск: node scripts/check-access.mjs <адрес сайта>
// Пароли берутся из переменных SEED_PASSWORD_STUDENT1, SEED_PASSWORD_STUDENT2, SEED_PASSWORD_STAFF (как в .env).
// Chromium: переменная CHROME_PATH или %LOCALAPPDATA%\Chromium\Application\chrome.exe.
import puppeteer from "puppeteer-core";
import path from "node:path";

const base = process.argv[2];
if (!base) {
  console.error("Нужно: node scripts/check-access.mjs <адрес сайта>");
  process.exit(2);
}

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Chromium/Application/chrome.exe"),
});
let failures = 0;
const check = (ok, text) => {
  console.log(`${ok ? "ok    " : "ОШИБКА"} ${text}`);
  if (!ok) failures++;
};
const url = (p) => new URL(p, base).href;

async function session(login, password) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.goto(url("/login"), { waitUntil: "networkidle0" });
  if (login) {
    await page.type("input[name=login]", login);
    await page.type("input[name=password]", password ?? "");
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.click("button[type=submit]")]);
  }
  return page;
}

async function open(page, p) {
  await page.goto(url(p), { waitUntil: "networkidle0" });
  return { path: new URL(page.url()).pathname, text: await page.evaluate(() => document.body.innerText) };
}

// 1. Без входа всё ведёт на страницу входа
const anon = await session();
for (const p of ["/", "/profile", "/staff"]) {
  check((await open(anon, p)).path === "/login", `без входа ${p} ведёт на /login`);
}

// 2. Неверный пароль
const wrong = await session("student1", "неверный-пароль");
check((await wrong.evaluate(() => document.body.innerText)).includes("Неверный логин или пароль"), "неверный пароль даёт понятную ошибку");

// 3. Студенты видят только свой профиль
const s1 = await session("student1", process.env.SEED_PASSWORD_STUDENT1);
const s2 = await session("student2", process.env.SEED_PASSWORD_STUDENT2);
const p1 = await open(s1, "/profile");
const p2 = await open(s2, "/profile");
check(p1.text.includes("Соколова") && !p1.text.includes("Петров"), "student1 видит в профиле только себя");
check(p2.text.includes("Петров") && !p2.text.includes("Соколова"), "student2 видит в профиле только себя");

// 3б. Аватарка меняется только у себя: student1 выбирает значок, у student2 по-прежнему инициалы. Потом возвращаем инициалы
const headerAvatar = async (page) => {
  await open(page, "/");
  return page.$eval('header a[aria-label="Профиль"]', (a) => (a.querySelector("svg") ? "значок" : a.textContent.trim()));
};
const pickAvatar = async (page, label) => {
  await open(page, "/profile");
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity));
  await page.click('button[aria-label="Сменить аватарку"]');
  await page.waitForSelector(`[role=radio][aria-label="${label}"]`);
  await page.click(`[role=radio][aria-label="${label}"]`);
  await page.waitForSelector("[role=dialog]", { hidden: true, timeout: 10000 }).catch(() => {});
};
await pickAvatar(s1, "Глобус");
check((await headerAvatar(s1)) === "значок", "student1 выбрал аватарку, она видна в шапке");
check((await headerAvatar(s2)) === "ИП", "у student2 аватарка не изменилась (инициалы)");
await pickAvatar(s1, "Инициалы");
check((await headerAvatar(s1)) === "АС", "student1 вернул инициалы");

// 4. Студент не открывает кабинет сотрудника
const st = await open(s1, "/staff");
check(st.text.includes("Страница не найдена") && !st.text.includes("Очередь заявок"), "student1 на /staff видит «Страница не найдена»");
// Шапка кабинета сотрудника не должна доходить до студента даже в исходном HTML, до проверки роли
const staffHtml = await s1.evaluate(() => fetch("/staff").then((r) => r.text()));
check(!staffHtml.includes("кабинет сотрудника"), "в ответе на /staff для студента нет шапки кабинета сотрудника");
// Cookie сессии недоступна скриптам страницы и привязана к хосту (__Host-): соседний сайт на общем домене не подложит свою
const cookie = (await s1.cookies()).find((c) => c.name.endsWith("session"));
const bound = cookie?.name === "__Host-session" || (!base.startsWith("https") && cookie?.name === "session");
check(Boolean(cookie?.httpOnly) && bound, `cookie сессии: ${cookie?.name}, httpOnly ${cookie?.httpOnly}`);

// 5. Сотрудник попадает в свой кабинет, а не в студенческий
const staff = await session("dekanat", process.env.SEED_PASSWORD_STAFF);
check((await open(staff, "/")).path === "/staff", "сотрудник с / попадает на /staff");

// 6. Заявки: каждый видит только свои, чужие не открываются даже по прямой ссылке
// Все заявки студента в разделе «Мои заявки» (на главной «Документов» только заявки в процессе)
const appIds = async (page) => {
  await open(page, "/documents/all");
  return page.evaluate(() =>
    [...new Set([...document.querySelectorAll('a[href^="/documents/"]')].map((a) => a.getAttribute("href")))].filter((h) => /^\/documents\/[0-9a-f-]{36}$/.test(h)),
  );
};
const ids1 = await appIds(s1);
const ids2 = await appIds(s2);
check(ids1.length > 0 && ids2.length > 0, "у обоих студентов есть заявки");
check(!ids1.some((id) => ids2.includes(id)), "списки заявок student1 и student2 не пересекаются");
const foreign = await open(s2, ids1[0]);
check(foreign.text.includes("Страница не найдена") && !foreign.text.includes("История"), "student2 не открывает заявку student1 по прямой ссылке");
const foreignDoc = await open(s2, `${ids1[0]}/document`);
check(foreignDoc.text.includes("Страница не найдена"), "student2 не открывает справку student1 по прямой ссылке");
check((await open(s1, "/documents/not-a-uuid")).text.includes("Страница не найдена"), "кривой адрес заявки даёт «не найдено», а не ошибку");

// 6а. Уведомления: в ленте только свои заявки
const noticeLinks = async (page) => {
  await open(page, "/notifications");
  return page.evaluate(() => [...document.querySelectorAll('main a[href^="/documents/"]')].map((a) => a.getAttribute("href")));
};
const n1 = await noticeLinks(s1);
const n2 = await noticeLinks(s2);
check(n1.length > 0 && n1.every((h) => ids1.includes(h)), "в уведомлениях student1 только его заявки");
check(n2.length > 0 && n2.every((h) => ids2.includes(h)), "в уведомлениях student2 только его заявки");

// 6в. Расписание своей группы: группа из сессии, адрес её не меняет. Текст всей недели, включая скрытые на телефоне дни
const week = async (page, p = "/schedule") => {
  await open(page, p);
  return page.evaluate(() => document.querySelector("main").textContent);
};
const w1 = await week(s1);
const w2 = await week(s2, "/schedule?group=МП-31&date=2026-11-10");
check(w1.includes("Международное право") && !w1.includes("Микроэкономика"), "student1 видит расписание только МП-31");
check(w2.includes("Микроэкономика") && !w2.includes("Международное право"), "student2 видит только МИЭП-12, даже с чужой группой в адресе");
check((await week(s1, "/schedule?date=не-дата")).includes("Международное право"), "кривая дата в адресе расписания не ломает страницу");

// 6г. Успеваемость своей группы. Семестр из адреса, которого у студента нет, открывает текущий, а не чужие оценки
const g1 = await week(s1, "/study?sem=1");
const g2 = await week(s2, "/study?sem=1");
check(g1.includes("Римское право") && !g1.includes("Математический анализ"), "student1 видит свои оценки за 1 семестр");
check(g2.includes("Математический анализ") && !g2.includes("Римское право"), "student2 с ?sem=1 видит свой текущий семестр, без оценок student1");
check((await week(s2, "/study?sem=999")).includes("Текущая аттестация"), "несуществующий семестр в адресе открывает текущий");

// 6б. Кабинет сотрудника: студент не открывает карточку заявки, даже своей, сотрудник видит заявки обоих
const own = await open(s1, ids1[0].replace("/documents/", "/staff/"));
check(own.text.includes("Страница не найдена") && !own.text.includes("Взять в работу"), "student1 не открывает /staff/<id> даже своей заявки");
await open(staff, "/staff");
// Вкладки показывают по одному списку, поэтому проходим все
const queue = [];
for (const tab of await staff.$$("button[role=tab]")) {
  await tab.click();
  await new Promise((r) => setTimeout(r, 300));
  queue.push(...(await staff.evaluate(() => [...document.querySelectorAll('[role=tabpanel] a[href^="/staff/"]')].map((a) => a.getAttribute("href")))));
}
const asStaff = (ids) => ids.map((h) => h.replace("/documents/", "/staff/"));
check([...asStaff(ids1), ...asStaff(ids2)].every((h) => queue.includes(h)), "сотрудник видит в очереди заявки обоих студентов");
const staffCard = await open(staff, asStaff(ids2)[0]);
check(staffCard.text.includes("Петров"), "сотрудник открывает карточку заявки студента");
check((await open(staff, ids1[0])).path === "/staff", "сотрудник со студенческой страницы заявки попадает в свой кабинет");
check((await open(staff, "/staff/not-a-uuid")).text.includes("Страница не найдена"), "кривой адрес в кабинете сотрудника даёт «не найдено»");

// 7. Проверка подлинности по QR: открыта без входа, но показывает только инициалы
let verify = null;
for (const id of ids1) {
  await open(s1, `${id}/document`);
  verify = await s1.$eval("[data-verify-link]", (a) => a.getAttribute("href")).catch(() => null);
  if (verify) break;
}
check(Boolean(verify), "у student1 есть готовая справка со ссылкой проверки");
if (verify) {
  const v = await open(anon, new URL(verify).pathname);
  check(v.text.includes("Документ действителен") && v.text.includes("Соколова А. Д.") && !v.text.includes("Анна"), "проверка без входа: действителен, только инициалы");
}
check((await open(anon, "/verify/0123456789abcdef0123456789abcdef")).text.includes("Документ не найден"), "проверка с выдуманным кодом: «Документ не найден»");

// 8. После выхода сессия больше не работает
await open(s1, "/profile");
// Пока идёт плавный переход страницы (около 0,5 с), браузер не пропускает нажатия к его участникам. Ждём конца.
await s1.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity));
// Кнопку сначала в центр экрана, иначе щелчок может прийтись на закреплённое нижнее меню.
await s1.$eval("form button[type=submit]", (b) => b.scrollIntoView({ block: "center" }));
await s1.click("form button[type=submit]");
// Next переходит после выхода без полной перезагрузки, поэтому ждём смену адреса, а не навигацию.
await s1.waitForFunction(() => location.pathname === "/login", { timeout: 10000 });
check((await open(s1, "/profile")).path === "/login", "после выхода /profile ведёт на /login");

await browser.close();
console.log(failures ? `\nПровалено проверок: ${failures}` : "\nВсе проверки пройдены");
process.exit(failures ? 1 : 0);
