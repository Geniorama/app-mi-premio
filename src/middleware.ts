import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, parseSessionCookie } from "@/lib/session";

const PROTECTED_PATHS = ["/perfil", "/extractos", "/gracias"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  const user = sessionValue ? parseSessionCookie(sessionValue) : null;

  // Usuario logueado intentando acceder al login → redirigir al perfil
  if (pathname.startsWith("/auth/login") && user) {
    return NextResponse.redirect(new URL("/perfil", request.url));
  }

  // Rutas protegidas sin sesión → redirigir al login
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/perfil/:path*", "/extractos/:path*", "/gracias/:path*", "/auth/login"],
};
