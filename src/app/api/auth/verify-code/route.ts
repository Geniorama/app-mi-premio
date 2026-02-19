import { NextResponse } from "next/server";
import { verifyLoginCode } from "@/lib/auth-codes";

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

    // TODO: Crear sesión/JWT y establecer cookie
    return NextResponse.json({
      success: true,
      message: "Sesión iniciada",
      redirect: "/perfil",
    });
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
