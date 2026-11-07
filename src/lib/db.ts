import postgres from "postgres";

// Одно подключение на процесс. В режиме разработки переживает перезагрузку модулей.
const g = globalThis as unknown as { sql?: postgres.Sql };

export const sql: postgres.Sql =
  g.sql ??
  (g.sql = postgres(process.env.DATABASE_URL ?? "postgres://dekanat@localhost:54329/dekanat", {
    max: 10,
    idle_timeout: 30,
    onnotice: () => {},
  }));
