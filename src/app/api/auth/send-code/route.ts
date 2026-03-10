import { NextResponse } from "next/server";
import { searchContactByEmail, isContactEligibleForLogin } from "@/lib/zoho";
import { storeLoginCode } from "@/lib/auth-codes";
import { sendLoginCodeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email?.trim();
    const debug = body?.debug === true;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email requerido" },
        { status: 400 }
      );
    }

    if (debug) {
      console.log("[send-code] Modo debug: validando contacto en Zoho (sin enviar email)...");
    }

    // 1. Validar que el contacto existe en Zoho CRM
    const contact = await searchContactByEmail(email);

    if (!contact) {
      console.log("[send-code] Validación fallida: contacto no existe en CRM");
      return NextResponse.json(
        {
          success: false,
          error: "Este correo no está registrado.",
          ...(debug && { debug: { conexionZoho: "OK", contactoExiste: false } }),
        },
        { status: 404 }
      );
    }

    if (!isContactEligibleForLogin(contact)) {
      return NextResponse.json(
        {
          success: false,
          error: "Tu cuenta no está activa. Contacta a soporte.",
          ...(debug && {
            debug: {
              Estado_Fidelizaci_n: contact.Estado_Fidelizaci_n,
              Estado: contact.Estado,
            },
          }),
        },
        { status: 403 }
      );
    }

    if (debug) {
      const debugInfo = {
        conexionZoho: "OK",
        contactoExiste: true,
        contactoId: contact.id,
        contactoEmail: contact.Email,
        contactoNombre: contact.Full_Name || `${contact.First_Name || ""} ${contact.Last_Name || ""}`.trim(),
      };
      console.log("[send-code] Validación exitosa:", JSON.stringify(debugInfo, null, 2));
      return NextResponse.json({
        success: true,
        message: "[DEBUG] Contacto encontrado. Conexión Zoho OK. Email NO enviado.",
        debug: debugInfo,
      });
    }

    // 2. Generar y guardar el código
    const code = storeLoginCode(email);

    // 3. Enviar el código por email
    const result = await sendLoginCodeEmail(email, code);

    if (!result.success) {
      console.error("[send-code] Fallo al enviar email:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "No se pudo enviar el código. Intenta más tarde.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Código enviado a tu correo. Revisa tu bandeja de entrada.",
    });
  } catch (error) {
    console.error("[send-code] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al enviar el código",
      },
      { status: 500 }
    );
  }
}
