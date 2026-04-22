import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionCookie, SESSION_COOKIE } from "@/lib/session";
import {
  getMembershipByEmail,
  getRedemptionsByEmail,
  searchContactByEmail,
} from "@/lib/zoho";

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;
  const user = sessionValue ? parseSessionCookie(sessionValue) : null;

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const [membership, redemptions, contact] = await Promise.all([
      getMembershipByEmail(user.email),
      getRedemptionsByEmail(user.email),
      searchContactByEmail(user.email),
    ]);

    const fullName =
      contact?.Full_Name ||
      [contact?.First_Name, contact?.Last_Name].filter(Boolean).join(" ") ||
      user.fullName;

    if (!membership) {
      return NextResponse.json(
        { membership: null, redemptions: [], fullName },
        { status: 200 }
      );
    }

    return NextResponse.json({
      fullName,
      membership: {
        id: membership.id,
        puntos: membership.Saldo_Puntos_Disponibles ?? null,
        categoria: membership.Categor_a ?? null,
      },
      puntosAcumulados: (membership.Puntos_Membresia ?? []).map((p) => ({
        id: p.id,
        numero: p.LinkingModule10_Serial_Number ?? null,
        puntosEntregados: p.Puntos_Entregados ?? null,
        puntosRedimidos: p.Puntos_Redimidos ?? null,
        fechaEntrega: p.Fecha_de_Entrega ?? null,
        fechaVencimiento: p.Fecha_de_vencimiento_Puntos ?? null,
        estado: p.Estado_Puntos_Entregados ?? null,
        entregaOC: p.Entrega_OC?.name ?? null,
        redencionNo: p.Redencion_No?.name ?? null,
      })),
      redemptions: redemptions.map((r) => ({
        id: r.id,
        numero: r.Name,
        puntos: r.Puntos_a_Redimir ?? null,
        estado: r.Estado_Redencion ?? null,
        fecha: r.Created_Time ?? null,
      })),
    });
  } catch (error) {
    console.error("[/api/user/membership] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener membresía" },
      { status: 500 }
    );
  }
}
