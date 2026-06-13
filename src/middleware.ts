import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection: redirects to /login when no Auth.js session cookie is
 * present on an app route. This is intentionally a cheap presence check (edge-safe, no
 * DB/Prisma) — the real authorization happens in each API route via requireUserId().
 */
export function middleware(req: NextRequest) {
  const hasSession =
    req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/words/:path*",
    "/review/:path*",
    "/practice/:path*",
    "/stats/:path*",
    "/settings/:path*",
  ],
};
