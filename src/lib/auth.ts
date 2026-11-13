import { cookies } from "next/headers";
import { HttpError } from "./http";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type Role,
  type Session,
} from "./session-token";

export type { Session, Role };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function requireSession(role?: Role): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Silakan masuk terlebih dahulu.");
  if (role && s.role !== role) throw new HttpError(403, "Kamu tidak punya akses untuk aksi ini.");
  return s;
}

export async function setSessionCookie(s: Session) {
  const token = await signSession(s);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
