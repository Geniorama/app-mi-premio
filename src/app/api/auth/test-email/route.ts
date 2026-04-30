import { NextResponse } from "next/server";
import { sendLoginCodeEmail } from "@/lib/email";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET no configurado" },
      { status: 500 }
    );
  }

  const provided = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (provided !== expected) {
    return NextResponse.json(
      { success: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const email = body?.email?.trim();
    const code = body?.code?.trim() || "123456";
    const baseUrl = body?.baseUrl?.trim();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email requerido" },
        { status: 400 }
      );
    }

    const result = await sendLoginCodeEmail(email, code, { baseUrl });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email de prueba enviado a ${email}`,
      sentCode: code,
      baseUrlUsed:
        baseUrl ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://mipremio.com.co",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}
