import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { setSessionCookie } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";

const Body = z.object({
  identifier: z.string().trim().min(1, "Isi email atau NIM"),
  password: z.string().min(1, "Isi kata sandi"),
});

export const POST = route(async (req) => {
  const { identifier, password } = Body.parse(await req.json());
  const id = identifier.toLowerCase();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(or(eq(schema.users.email, id), eq(schema.users.nim, identifier.toUpperCase())))
    .limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Email/NIM atau kata sandi salah.");
  }
  await setSessionCookie({ uid: user.id, role: user.role, name: user.name });
  return json({ ok: true, role: user.role, name: user.name });
});
