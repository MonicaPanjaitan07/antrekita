import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DB = NodePgDatabase<typeof schema>;
const globalForDb = globalThis as unknown as { antrekitaDb?: DB };

function getDb(): DB {
  if (globalForDb.antrekitaDb) return globalForDb.antrekitaDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi. Lihat .env.example");
  const pool = new Pool({
    connectionString: url,
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idleTimeoutMillis: 10_000,
  });
  const instance = drizzle(pool, { schema });
  globalForDb.antrekitaDb = instance;
  return instance;
}

// Koneksi dibuat saat pertama kali dipakai (bukan saat build).
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
