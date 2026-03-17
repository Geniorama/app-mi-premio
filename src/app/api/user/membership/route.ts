import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionCookie, SESSION_COOKIE } from "@/lib/session";
import { getMembershipByEmail, getRedemptionsByEmail } from "@/lib/zoho";

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;
  const user = sessionValue ? parseSessionCookie(sessionValue) : null;

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const [membership, redemptions] = await Promise.all([
      getMembershipByEmail(user.email),
      getRedemptionsByEmail(user.email),
    ]);

    if (!membership) {
      return NextResponse.json({ membership: null, redemptions: [] }, { status: 200 });
    }

    return NextResponse.json({
      membership: {
        id: membership.id,
        puntos: membership.Saldo_Puntos_Disponibles ?? null,
        categoria: membership.Categor_a ?? null,
      },
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
