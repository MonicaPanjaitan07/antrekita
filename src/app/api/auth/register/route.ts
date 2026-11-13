import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { setSessionCookie } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";

const Body = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter").max(80),
  nim: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,15}$/, "NIM hanya huruf/angka, 6–15 karakter"),
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  prodi: z.string().trim().max(80).optional(),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(100),
});

export const POST = route(async (req) => {
  const data = Body.parse(await req.json());

  const allowed = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length && !allowed.some((d) => data.email.endsWith(`@${d}`))) {
    throw new HttpError(400, `Gunakan email kampus (${allowed.map((d) => "@" + d).join(", ")}).`);
  }

  const [exists] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(or(eq(schema.users.email, data.email), eq(schema.users.nim, data.nim)))
    .limit(1);
  if (exists) throw new HttpError(409, "Email atau NIM sudah terdaftar. Silakan masuk.");

  const [user] = await db
    .insert(schema.users)
    .values({
      name: data.name,
      nim: data.nim,
      email: data.email,
      prodi: data.prodi || null,
      passwordHash: await bcrypt.hash(data.password, 10),
      role: "STUDENT",
    })
    .returning();
  await setSessionCookie({ uid: user.id, role: user.role, name: user.name });
  return json({ ok: true }, 201);
});
