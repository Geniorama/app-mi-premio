import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";
import { buildAffiliateReport } from "@/lib/zoho-reports";
import { toCsv, csvResponse, formatDateTimeForCsv } from "@/lib/csv";
import { parsePagination, paginate } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;

  try {
    const report = await buildAffiliateReport(params.get("refresh") === "1");
    let rows = report.affiliates;

    const search = params.get("q")?.toLowerCase().trim();
    if (search) {
      rows = rows.filter((row) =>
        [row.nombre, row.email, row.membresiaNo, row.empresa]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    const tipo = params.get("tipo");
    if (tipo) rows = rows.filter((row) => row.tipoAfiliado === tipo);

    if (params.get("conSaldo") === "1") {
      rows = rows.filter((row) => row.saldoDisponible > 0);
    }
    if (params.get("conRedenciones") === "1") {
      rows = rows.filter((row) => row.redenciones > 0);
    }

    const sort = params.get("sort") ?? "puntosEntregados";
    const direction = params.get("dir") === "asc" ? 1 : -1;
    const numericKeys = new Set([
      "puntosEntregados",
      "saldoDisponible",
      "puntosRedimidos",
      "puntosVencidos",
      "puntosPorVencer",
      "redenciones",
      "ciclos",
    ]);

    rows = [...rows].sort((a, b) => {
      if (numericKeys.has(sort)) {
        const left = a[sort as keyof typeof a] as number;
        const right = b[sort as keyof typeof b] as number;
        return (left - right) * direction;
      }
      const left = String(a[sort as keyof typeof a] ?? "");
      const right = String(b[sort as keyof typeof b] ?? "");
      return left.localeCompare(right) * direction;
    });

    // El CSV exporta todo lo filtrado, nunca solo la página visible.
    if (params.get("format") === "csv") {
      const csv = toCsv(rows, [
        { key: "nombre", header: "Afiliado", value: (r) => r.nombre },
        { key: "email", header: "Correo", value: (r) => r.email },
        { key: "membresiaNo", header: "Membresía", value: (r) => r.membresiaNo },
        { key: "empresa", header: "Empresa", value: (r) => r.empresa },
        { key: "tipoAfiliado", header: "Tipo de afiliado", value: (r) => r.tipoAfiliado },
        { key: "estado", header: "Estado fidelización", value: (r) => r.estadoFidelizacion },
        { key: "puntosEntregados", header: "Puntos entregados", value: (r) => r.puntosEntregados },
        { key: "puntosRedimidos", header: "Puntos redimidos", value: (r) => r.puntosRedimidos },
        { key: "saldoDisponible", header: "Saldo disponible", value: (r) => r.saldoDisponible },
        { key: "puntosPorVencer", header: "Puntos por vencer", value: (r) => r.puntosPorVencer },
        { key: "puntosVencidos", header: "Puntos vencidos", value: (r) => r.puntosVencidos },
        { key: "ciclos", header: "Ciclos", value: (r) => r.ciclos },
        { key: "redenciones", header: "Redenciones", value: (r) => r.redenciones },
        {
          key: "ultimaRedencion",
          header: "Última redención",
          value: (r) => formatDateTimeForCsv(r.ultimaRedencion),
        },
      ]);

      return csvResponse(csv, "afiliados");
    }

    // El resumen se calcula sobre el conjunto completo, antes de paginar
    const resumen = {
      afiliados: rows.length,
      puntosEntregados: rows.reduce((t, r) => t + r.puntosEntregados, 0),
      puntosRedimidos: rows.reduce((t, r) => t + r.puntosRedimidos, 0),
      saldoDisponible: rows.reduce((t, r) => t + r.saldoDisponible, 0),
    };

    const { rows: pageRows, pagination } = paginate(rows, parsePagination(params));

    return NextResponse.json({
      rows: pageRows,
      pagination,
      resumen,
      tipos: [...new Set(report.affiliates.map((r) => r.tipoAfiliado))].filter(Boolean),
      generadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/affiliates] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error generando el informe",
      },
      { status: 502 }
    );
  }
}
