// Все проверки подряд с итогом. На локальном сервере ещё и те, что создают заявки (check-flow, check-actions).
// Запуск: set -a && . ./.env && set +a && node scripts/check-all.mjs <адрес>
// С CHROME_REMOTE=http://127.0.0.1:9222 проверки, которые это умеют, идут в Chrome эмулятора Android.
// QUICK=1 пропускает долгую проверку 9 размеров окна.
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const base = process.argv[2];
if (!base) {
  console.error("Нужно: node scripts/check-all.mjs <адрес>");
  process.exit(2);
}
const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(base);
const shots = mkdtempSync(path.join(tmpdir(), "check-all-"));
const student = { SHOT_LOGIN: "student1", SHOT_PASSWORD: process.env.SEED_PASSWORD_STUDENT1 ?? "" };

const runs = [
  ["Разделение доступа", "check-access.mjs", [base]],
  ["Навигация и «назад»", "check-nav.mjs", [base], student],
  ["Учёба", "check-study.mjs", [base, path.join(shots, "study")]],
  ["Расписание и карточка пары", "check-schedule.mjs", [base]],
  ...(local
    ? [
        ["Студент и деканат: сквозной сценарий", "check-flow.mjs", [base]],
        ["Все действия: формы, отказ, справка, сеть, лимит входа", "check-actions.mjs", [base]],
      ]
    : []),
  ...(process.env.QUICK ? [] : [["9 размеров окна компьютера", "check-sizes.mjs", [base, path.join(shots, "sizes")]]]),
];

const results = [];
for (const [name, script, args, env] of runs) {
  const started = Date.now();
  console.log(`\n=== ${name} (${script})`);
  const r = spawnSync(process.execPath, [path.join("scripts", script), ...args], { stdio: "inherit", env: { ...process.env, ...env } });
  results.push({ name, ok: r.status === 0, sec: Math.round((Date.now() - started) / 1000) });
}

console.log("\nИтог:");
for (const r of results) console.log(`${r.ok ? "ok    " : "ОШИБКА"} ${r.name} (${r.sec} с)`);
if (!local) console.log("Сценарии, которые создают заявки, на этом адресе пропущены: только локально.");
console.log(`Снимки: ${shots}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
