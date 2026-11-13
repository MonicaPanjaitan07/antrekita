// Memuat .env / .env.local untuk script CLI (Next.js sudah memuatnya sendiri).
import { existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (existsSync(f)) {
    try {
      process.loadEnvFile(f);
    } catch {
      // abaikan
    }
  }
}
