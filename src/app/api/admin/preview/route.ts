import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";
import { searchContactByEmail, getMembershipByEmail } from "@/lib/zoho";
import {
  createPreviewToken,
  sessionCookieOptions,
  PREVIEW_COOKIE,
  PREVIEW_MAX_AGE,
} from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Inicia una previsualización: el administrador verá el área de afiliados
 * como la ve el afiliado indicado, en **solo lectura**.
 *
 * La cookie que se emite tiene ámbito `preview`, no `user`, así que ninguna
 * ruta de escritura la acepta (ver `lib/viewer.ts`). No se toca la sesión de
 * afiliado: si el administrador tuviera una propia, seguiría intacta.
 */
export async function POST(request: Request) {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Falta el correo del afiliado" },
        { status: 400 }
      );
    }

    // Se resuelve el contacto en Zoho para mostrar su nombre real y para no
    // abrir previsualizaciones de correos que no existen en el CRM. La
    // membresía se comprueba porque el área de afiliados se alimenta de ella:
    // sin membresía el perfil sale vacío. El panel ya no ofrece el botón en
    // ese caso, pero esconder un botón no es una barrera.
    const [contact, membership] = await Promise.all([
      searchContactByEmail(email),
      getMembershipByEmail(email).catch((error) => {
        console.error("[admin/preview] No se pudo leer la membresía:", error);
        return null;
      }),
    ]);

    if (!contact) {
      return NextResponse.json(
        { error: "Ese correo no existe como contacto en Zoho CRM" },
        { status: 404 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "Ese afiliado todavía no tiene membresía en Zoho, así que no hay perfil que previsualizar.",
        },
        { status: 409 }
      );
    }

    const fullName =
      contact.Full_Name ||
      [contact.First_Name, contact.Last_Name].filter(Boolean).join(" ") ||
      email;

    const token = await createPreviewToken({
      email,
      fullName,
      contactId: contact.id ?? "",
      adminEmail: admin.email,
    });

    // Rastro de quién miró la cuenta de quién
    console.log(`[admin/preview] ${admin.email} previsualiza a ${email}`);

    const response = NextResponse.json({
      success: true,
      preview: { email, fullName },
      redirect: "/perfil",
    });

    response.cookies.set(
      PREVIEW_COOKIE,
      token,
      sessionCookieOptions(PREVIEW_MAX_AGE)
    );

    return response;
  } catch (error) {
    console.error("[admin/preview] POST:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar la previsualización" },
      { status: 502 }
    );
  }
}

/** Termina la previsualización. No exige sesión de admin: siempre debe poder salirse. */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(PREVIEW_COOKIE, "", sessionCookieOptions(0));
  return response;
}
