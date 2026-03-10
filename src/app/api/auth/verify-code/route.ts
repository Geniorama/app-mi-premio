import { NextResponse } from "next/server";
import { verifyLoginCode } from "@/lib/auth-codes";
import { searchContactByEmail, isContactEligibleForLogin } from "@/lib/zoho";
import {
  setSessionCookie,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email?.trim();
    const code = body?.code?.trim();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Email y código requeridos" },
        { status: 400 }
      );
    }

    const valid = verifyLoginCode(email, code);

    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Código inválido o expirado" },
        { status: 401 }
      );
    }

    const contact = await searchContactByEmail(email);

    if (!isContactEligibleForLogin(contact)) {
      return NextResponse.json(
        { success: false, error: "Tu cuenta no está activa. Contacta a soporte." },
        { status: 403 }
      );
    }

    const sessionValue = setSessionCookie({
      email,
      fullName:
        contact?.Full_Name ||
        [contact?.First_Name, contact?.Last_Name].filter(Boolean).join(" ") ||
        email,
      contactId: contact?.id || "",
    });

    const response = NextResponse.json({
      success: true,
      message: "Sesión iniciada",
      redirect: "/perfil",
    });

    response.cookies.set(SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[verify-code]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al verificar código",
      },
      { status: 500 }
    );
  }
}
