// Выполняется один раз при старте сервера: создаёт таблицы и демо-аккаунты.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { initDb } = await import("./lib/init-db");
  await initDb();
}
