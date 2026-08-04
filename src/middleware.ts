import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
  verifyAdminSessionToken,
} from "@/lib/session";

const PROTECTED_PATHS = ["/perfil", "/extractos", "/gracias"];

const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_HOME_PATH = "/admin/informes";

function matchesPath(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ------------------------------------------------------------ panel admin
  if (matchesPath(pathname, "/admin")) {
    const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const admin = await verifyAdminSessionToken(adminToken);

    if (matchesPath(pathname, ADMIN_LOGIN_PATH)) {
      return admin
        ? NextResponse.redirect(new URL(ADMIN_HOME_PATH, request.url))
        : NextResponse.next();
    }

    if (!admin) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      // Volver a donde iba después de autenticarse
      if (pathname !== "/admin") loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // --------------------------------------------------------- área afiliados
  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await verifySessionToken(sessionValue);

  // Usuario logueado intentando acceder al login → redirigir al perfil
  if (pathname.startsWith("/auth/login") && user) {
    return NextResponse.redirect(new URL("/perfil", request.url));
  }

  // Rutas protegidas sin sesión → redirigir al login
  const isProtected = PROTECTED_PATHS.some((path) =>
    matchesPath(pathname, path)
  );

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/perfil/:path*",
    "/extractos/:path*",
    "/gracias/:path*",
    "/auth/login",
    "/admin/:path*",
  ],
};
