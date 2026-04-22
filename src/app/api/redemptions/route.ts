import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionCookie, SESSION_COOKIE } from "@/lib/session";
import { getMembershipByEmail, createRedemptionInZoho } from "@/lib/zoho";
import { sanityClient } from "@/sanity/client";
import { sanityWriteClient, assertWriteClient } from "@/sanity/writeClient";
import { voucherBySlugQuery } from "@/sanity/queries";
import type { Voucher } from "@/sanity/types";

interface RedemptionRequestBody {
  voucherSlug?: string;
  termsAcceptedAt?: string;
  deliveryEmail?: string;
}

export async function POST(request: Request) {
  try {
    assertWriteClient();
  } catch {
    return NextResponse.json(
      { error: "Servidor mal configurado (falta SANITY_API_WRITE_TOKEN)" },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;
  const user = sessionValue ? parseSessionCookie(sessionValue) : null;
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: RedemptionRequestBody;
  try {
    body = (await request.json()) as RedemptionRequestBody;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { voucherSlug, termsAcceptedAt, deliveryEmail } = body;
  if (!voucherSlug) {
    return NextResponse.json(
      { error: "voucherSlug es requerido" },
      { status: 400 }
    );
  }

  // 1. Voucher en Sanity (validar que exista y tenga puntos)
  const voucher = await sanityClient.fetch<Voucher | null>(voucherBySlugQuery, {
    slug: voucherSlug,
  });
  if (!voucher) {
    return NextResponse.json(
      { error: "Voucher no encontrado o inactivo" },
      { status: 404 }
    );
  }
  const points = voucher.pointsValue;
  if (!points || points < 1) {
    return NextResponse.json(
      { error: "El voucher no tiene valor en puntos configurado" },
      { status: 400 }
    );
  }

  // 2. Membresía en Zoho (validar saldo)
  const membership = await getMembershipByEmail(user.email);
  if (!membership) {
    return NextResponse.json(
      { error: "Membresía no encontrada en Zoho" },
      { status: 404 }
    );
  }
  const balance = membership.Saldo_Puntos_Disponibles ?? 0;
  if (balance < points) {
    return NextResponse.json(
      {
        error: "Saldo insuficiente",
        balance,
        required: points,
      },
      { status: 400 }
    );
  }

  // 3. Crear redención en Zoho (fuente de verdad del descuento)
  let zohoRecord: { id: string; createdTime?: string };
  try {
    zohoRecord = await createRedemptionInZoho(membership.id, points);
  } catch (err) {
    console.error("[/api/redemptions] Zoho POST error:", err);
    return NextResponse.json(
      { error: "No se pudo crear la redención en Zoho" },
      { status: 502 }
    );
  }

  // 4. Registrar evento en Sanity (auditoría / entrega)
  try {
    await sanityWriteClient.create({
      _type: "redemption",
      zohoRedemptionId: zohoRecord.id,
      zohoMembershipId: membership.id,
      email: user.email,
      pointsRedeemed: points,
      voucher: { _type: "reference", _ref: voucher._id },
      status: "pendiente",
      redeemedAt: zohoRecord.createdTime ?? new Date().toISOString(),
      termsAcceptedAt: termsAcceptedAt ?? new Date().toISOString(),
      ...(deliveryEmail ? { deliveryEmail } : {}),
    });
  } catch (err) {
    // No bloqueante: Zoho ya tiene la redención (source of truth del saldo)
    console.error(
      "[/api/redemptions] Sanity write error (redención ya existe en Zoho):",
      err
    );
  }

  return NextResponse.json({
    zohoRedemptionId: zohoRecord.id,
    pointsRedeemed: points,
    newBalance: balance - points,
  });
}
