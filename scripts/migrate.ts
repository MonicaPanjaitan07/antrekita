// Menjalankan file SQL di db/migrations/ secara berurutan (sekali saja per file).
// Pemakaian: npm run db:migrate   (otomatis dijalankan saat deploy di Vercel)
import "./env";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi.");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS "_antrekita_migrations" (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const done = new Set(
    (await client.query<{ name: string }>(`SELECT name FROM "_antrekita_migrations"`)).rows.map((r) => r.name),
  );
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(path.join(dir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO "_antrekita_migrations"(name) VALUES ($1)`, [file]);
      await client.query("COMMIT");
      applied++;
      console.log("ok");
    } catch (e) {
      await client.query("ROLLBACK");
      console.log("GAGAL");
      throw e;
    }
  }
  console.log(applied ? `✓ ${applied} migrasi diterapkan.` : "✓ Database sudah terbaru.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
