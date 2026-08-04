import { NextResponse } from "next/server";
import { getAdminByEmail } from "@/lib/admin";
import { storeLoginCode } from "@/lib/auth-codes";
import { sendLoginCodeEmail } from "@/lib/email";

/**
 * Envía el código de acceso al panel administrativo.
 *
 * A diferencia de `/api/auth/send-code`, no valida contra Zoho: los
 * administradores son documentos `adminUser` de Sanity, no afiliados del CRM.
 *
 * La respuesta es idéntica exista o no el administrador, para no revelar
 * qué correos tienen acceso al panel.
 */
export async function POST(request: Request) {
  const genericResponse = NextResponse.json({
    success: true,
    message: "Si el correo tiene acceso, recibirás un código en unos segundos.",
  });

  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Correo requerido" },
        { status: 400 }
      );
    }

    const admin = await getAdminByEmail(email);

    if (!admin) {
      console.log("[admin/send-code] Correo sin acceso al panel:", email);
      return genericResponse;
    }

    const code = storeLoginCode(email, "admin");
    const result = await sendLoginCodeEmail(email, code);

    if (!result.success) {
      console.error("[admin/send-code] Fallo al enviar email:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo enviar el código. Intenta más tarde.",
        },
        { status: 500 }
      );
    }

    return genericResponse;
  } catch (error) {
    console.error("[admin/send-code] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al enviar el código" },
      { status: 500 }
    );
  }
}
