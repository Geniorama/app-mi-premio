import { NextResponse } from "next/server";
import { verifyLoginCode } from "@/lib/auth-codes";
import { getAdminByEmail } from "@/lib/admin";
import {
  createAdminSessionToken,
  sessionCookieOptions,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
} from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Correo y código requeridos" },
        { status: 400 }
      );
    }

    if (!verifyLoginCode(email, code, "admin")) {
      return NextResponse.json(
        { success: false, error: "Código inválido o expirado" },
        { status: 401 }
      );
    }

    // Revalidar el acceso: el administrador pudo desactivarse mientras el
    // código estaba vigente.
    const admin = await getAdminByEmail(email);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Esta cuenta no tiene acceso al panel." },
        { status: 403 }
      );
    }

    const token = await createAdminSessionToken({
      email: admin.email.toLowerCase().trim(),
      fullName: admin.name || admin.email,
      adminId: admin._id,
      role: admin.role || "viewer",
    });

    const response = NextResponse.json({
      success: true,
      message: "Sesión iniciada",
      redirect: "/admin/informes",
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      token,
      sessionCookieOptions(ADMIN_SESSION_MAX_AGE)
    );

    return response;
  } catch (error) {
    console.error("[admin/verify-code]", error);
    return NextResponse.json(
      { success: false, error: "Error al verificar el código" },
      { status: 500 }
    );
  }
}
