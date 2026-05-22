import { NextResponse } from "next/server";
import {
  sendRedemptionAdminEmail,
  sendRedemptionUserEmail,
} from "@/lib/email";

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
    const adminEmail = body?.adminEmail?.trim();
    const fullName = body?.fullName?.trim() || "Afiliado de Prueba";
    const voucherTitle =
      body?.voucherTitle?.trim() || "Bono Éxito $50.000";
    const points = Number.isFinite(Number(body?.points))
      ? Number(body.points)
      : 5000;
    const segment = body?.segment?.trim() || "Empresa de Prueba";
    const target = (body?.target as string | undefined)?.trim() || "both";
    const baseUrl = body?.baseUrl?.trim();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email requerido" },
        { status: 400 }
      );
    }

    const results: Record<string, { success: boolean; error?: string }> = {};

    if (target === "user" || target === "both") {
      results.user = await sendRedemptionUserEmail({
        to: email,
        fullName,
        voucherTitle,
        points,
        baseUrl,
      });
    }

    if (target === "admin" || target === "both") {
      results.admin = await sendRedemptionAdminEmail({
        userFullName: fullName,
        userEmail: email,
        segment,
        voucherTitle,
        points,
        baseUrl,
        adminTo: adminEmail,
      });
    }

    const allOk = Object.values(results).every((r) => r.success);

    return NextResponse.json(
      {
        success: allOk,
        message: allOk
          ? `Correos de prueba enviados (target=${target})`
          : "Uno o más correos fallaron",
        target,
        sentTo: {
          user: target !== "admin" ? email : undefined,
          admin:
            target !== "user"
              ? adminEmail ||
                process.env.MI_PREMIO_ADMIN_EMAIL ||
                "mipremio@germanmoraleshoteles.com"
              : undefined,
        },
        results,
        baseUrlUsed:
          baseUrl ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://mipremiogermanmoraleshoteles.com",
      },
      { status: allOk ? 200 : 500 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 }
    );
  }
}
