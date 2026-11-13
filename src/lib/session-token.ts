// Dipakai oleh middleware (edge runtime) dan server. Jangan import Prisma di sini.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ak_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

export type Role = "STUDENT" | "STAFF";
export type Session = { uid: string; role: Role; name: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET belum diisi (minimal 16 karakter).");
    }
    return new TextEncoder().encode("antrekita-dev-secret-jangan-dipakai-di-production");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ role: s.role, name: s.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.uid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || (payload.role !== "STUDENT" && payload.role !== "STAFF")) return null;
    return { uid: payload.sub, role: payload.role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
