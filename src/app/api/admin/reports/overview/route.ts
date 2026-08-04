import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";
import { buildAffiliateReport } from "@/lib/zoho-reports";
import { sanityFreshClient } from "@/sanity/client";
import { redemptionsAuditQuery } from "@/sanity/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface AuditDoc {
  zohoRedemptionId?: string;
  voucherTitle?: string;
  voucherCategory?: string;
  pointsRedeemed?: number;
  status?: string;
}

/** Últimos 12 meses en formato `AAAA-MM`, del más antiguo al más reciente. */
function lastTwelveMonths(): string[] {
  const months: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);

  for (let i = 11; i >= 0; i--) {
    const date = new Date(cursor);
    date.setMonth(cursor.getMonth() - i);
    months.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return months;
}

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get("refresh") === "1";

  try {
    const [report, audit] = await Promise.all([
      buildAffiliateReport(force),
      sanityFreshClient
        .fetch<AuditDoc[]>(redemptionsAuditQuery)
        .catch((error) => {
          console.error("[admin/overview] Sanity no respondió:", error);
          return [] as AuditDoc[];
        }),
    ]);

    // Serie mensual de redenciones (Zoho es la fuente de verdad del canje)
    const months = lastTwelveMonths();
    const byMonth = new Map(
      months.map((month) => [month, { mes: month, redenciones: 0, puntos: 0 }])
    );

    for (const redemption of report.redemptions) {
      if (!redemption.fecha) continue;
      const month = redemption.fecha.slice(0, 7);
      const bucket = byMonth.get(month);
      if (!bucket) continue;
      bucket.redenciones += 1;
      bucket.puntos += redemption.puntos;
    }

    // Bonos más canjeados: solo Sanity sabe qué bono se pidió
    const byVoucher = new Map<string, { bono: string; canjes: number; puntos: number }>();
    for (const doc of audit) {
      const title = doc.voucherTitle || "Sin bono asociado";
      const bucket = byVoucher.get(title) ?? { bono: title, canjes: 0, puntos: 0 };
      bucket.canjes += 1;
      bucket.puntos += Number(doc.pointsRedeemed) || 0;
      byVoucher.set(title, bucket);
    }

    const topAfiliados = [...report.affiliates]
      .filter((affiliate) => affiliate.puntosRedimidos > 0)
      .sort((a, b) => b.puntosRedimidos - a.puntosRedimidos)
      .slice(0, 10)
      .map((affiliate) => ({
        nombre: affiliate.nombre || affiliate.email,
        email: affiliate.email,
        puntosRedimidos: affiliate.puntosRedimidos,
        redenciones: affiliate.redenciones,
      }));

    return NextResponse.json({
      totals: report.totals,
      serieMensual: [...byMonth.values()],
      topAfiliados,
      topBonos: [...byVoucher.values()]
        .sort((a, b) => b.canjes - a.canjes)
        .slice(0, 10),
      // Cuántas redenciones de Zoho tienen su contraparte auditada en la web
      cobertura: {
        redencionesZoho: report.redemptions.length,
        redencionesAuditadas: audit.length,
      },
      generadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/overview] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error generando el informe",
      },
      { status: 502 }
    );
  }
}
