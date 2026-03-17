import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

/** Solo disponible en desarrollo. NUNCA debe llegar a producción.
 *  POST /api/auth/dev-login
 *  Body: { "email": "correo@ejemplo.com", "fullName": "Nombre Opcional", "contactId": "id-opcional" }
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { email, fullName, contactId } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Falta el campo email" }, { status: 400 });
  }

  const sessionValue = setSessionCookie({
    email,
    fullName: fullName || email,
    contactId: contactId || "dev",
  });

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
