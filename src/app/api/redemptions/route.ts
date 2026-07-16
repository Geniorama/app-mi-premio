import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionCookie, SESSION_COOKIE } from "@/lib/session";
import { getMembershipByEmail, createRedemptionInZoho } from "@/lib/zoho";
import {
  sendRedemptionAdminEmail,
  sendRedemptionUserEmail,
} from "@/lib/email";
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

  // 3. Repartir los puntos FIFO entre los registros de la red
  //    (los puntos más antiguos se consumen primero; si un registro no
  //    alcanza, se divide en varias redenciones)
  const red =
    membership.redFifo && membership.redFifo.length > 0
      ? membership.redFifo
      : [
          {
            id: membership.id,
            nombre: membership.id,
            saldo: balance,
            puntosMasAntiguos: null,
          },
        ];

  const tramos: { membershipId: string; points: number }[] = [];
  let restante = points;
  for (const registro of red) {
    if (restante <= 0) break;
    const take = Math.min(registro.saldo, restante);
    if (take <= 0) continue;
    tramos.push({ membershipId: registro.id, points: take });
    restante -= take;
  }
  if (restante > 0) {
    // No debería ocurrir: el saldo global ya se validó arriba
    return NextResponse.json(
      { error: "Saldo insuficiente", balance, required: points },
      { status: 400 }
    );
  }

  // 4. Crear redenciones en Zoho (fuente de verdad del descuento)
  const zohoRecords: {
    id: string;
    createdTime?: string;
    membershipId: string;
    points: number;
  }[] = [];
  for (const tramo of tramos) {
    try {
      const record = await createRedemptionInZoho(
        tramo.membershipId,
        tramo.points
      );
      zohoRecords.push({ ...record, ...tramo });
    } catch (err) {
      console.error(
        `[/api/redemptions] Zoho POST error (tramo ${tramo.membershipId}, ` +
          `${zohoRecords.length}/${tramos.length} tramos ya creados):`,
        err
      );
      return NextResponse.json(
        {
          error: "No se pudo crear la redención en Zoho",
          // Redenciones ya creadas antes del fallo (para revisión manual)
          createdRedemptionIds: zohoRecords.map((r) => r.id),
        },
        { status: 502 }
      );
    }
  }
  const zohoRecord = zohoRecords[0];

  // 5. Registrar eventos en Sanity (auditoría / entrega), uno por tramo
  try {
    await Promise.all(
      zohoRecords.map((record) =>
        sanityWriteClient.create({
          _type: "redemption",
          zohoRedemptionId: record.id,
          zohoMembershipId: record.membershipId,
          email: user.email,
          pointsRedeemed: record.points,
          voucher: { _type: "reference", _ref: voucher._id },
          status: "pendiente",
          redeemedAt: record.createdTime ?? new Date().toISOString(),
          termsAcceptedAt: termsAcceptedAt ?? new Date().toISOString(),
          ...(deliveryEmail ? { deliveryEmail } : {}),
        })
      )
    );
  } catch (err) {
    // No bloqueante: Zoho ya tiene las redenciones (source of truth del saldo)
    console.error(
      "[/api/redemptions] Sanity write error (redenciones ya existen en Zoho):",
      err
    );
  }

  // 6. Notificaciones por email (no bloqueantes)
  const recipientEmail = deliveryEmail?.trim() || user.email;
  const userEmailResult = await sendRedemptionUserEmail({
    to: recipientEmail,
    fullName: user.fullName,
    voucherTitle: voucher.title,
    points,
  });
  if (!userEmailResult.success) {
    console.error(
      "[/api/redemptions] Email al usuario falló:",
      userEmailResult.error
    );
  }

  const adminEmailResult = await sendRedemptionAdminEmail({
    userFullName: user.fullName,
    userEmail: user.email,
    segment: membership.Categor_a ?? null,
    voucherTitle: voucher.title,
    points,
    requestDate: zohoRecord.createdTime
      ? new Date(zohoRecord.createdTime)
      : new Date(),
  });
  if (!adminEmailResult.success) {
    console.error(
      "[/api/redemptions] Email al admin falló:",
      adminEmailResult.error
    );
  }

  return NextResponse.json({
    zohoRedemptionId: zohoRecord.id,
    zohoRedemptionIds: zohoRecords.map((r) => r.id),
    pointsRedeemed: points,
    newBalance: balance - points,
  });
}
