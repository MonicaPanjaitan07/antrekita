import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

// Halaman yang wajib login. /petugas hanya untuk role STAFF.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/petugas") && session.role !== "STAFF") {
    return NextResponse.redirect(new URL("/jadwal", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/saya/:path*", "/asisten/:path*", "/checkin/:path*", "/petugas/:path*"],
};
