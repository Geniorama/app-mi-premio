import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";
import { listPointsLots } from "@/lib/zoho-reports";
import { toCsv, csvResponse, formatDateTimeForCsv } from "@/lib/csv";
import { parsePagination, paginate } from "@/lib/pagination";

/**
 * Informe de puntos próximos a vencer.
 *
 * Es el más costoso del panel: el detalle de vencimientos vive en el
 * subformulario `Puntos_Membresia`, que Zoho solo entrega en el GET
 * individual de cada membresía. Va cacheado 15 minutos.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const days = Number(params.get("dias")) || 90;

  try {
    const lots = await listPointsLots(params.get("refresh") === "1");

    // Solo lotes con saldo vivo: un lote consumido no interesa al informe
    let rows = lots.filter((lot) => lot.saldoLote > 0);

    const incluirVencidos = params.get("incluirVencidos") === "1";
    rows = rows.filter((lot) => {
      if (lot.diasParaVencer === null) return false;
      if (lot.diasParaVencer < 0) return incluirVencidos;
      return lot.diasParaVencer <= days;
    });

    const search = params.get("q")?.toLowerCase().trim();
    if (search) {
      rows = rows.filter((lot) =>
        [lot.nombre, lot.email, lot.membershipName]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    // El CSV exporta todo lo filtrado, nunca solo la página visible.
    if (params.get("format") === "csv") {
      const csv = toCsv(rows, [
        { key: "nombre", header: "Afiliado", value: (r) => r.nombre },
        { key: "email", header: "Correo", value: (r) => r.email },
        { key: "membershipName", header: "Membresía", value: (r) => r.membershipName },
        { key: "puntosEntregados", header: "Puntos del lote", value: (r) => r.puntosEntregados },
        { key: "puntosRedimidos", header: "Redimidos del lote", value: (r) => r.puntosRedimidos },
        { key: "saldoLote", header: "Saldo del lote", value: (r) => r.saldoLote },
        {
          key: "fechaEntrega",
          header: "Fecha de entrega",
          value: (r) => formatDateTimeForCsv(r.fechaEntrega),
        },
        {
          key: "fechaVencimiento",
          header: "Vence el",
          value: (r) => (r.fechaVencimiento ?? "").slice(0, 10),
        },
        { key: "diasParaVencer", header: "Días para vencer", value: (r) => r.diasParaVencer },
        { key: "estado", header: "Estado del lote", value: (r) => r.estado },
      ]);

      return csvResponse(csv, "puntos-por-vencer");
    }

    // Agrupación por ventana temporal, para las tarjetas del informe
    const ventanas = [
      { clave: "vencidos", etiqueta: "Ya vencidos", min: -Infinity, max: -1 },
      { clave: "30", etiqueta: "Próximos 30 días", min: 0, max: 30 },
      { clave: "60", etiqueta: "31 a 60 días", min: 31, max: 60 },
      { clave: "90", etiqueta: "61 a 90 días", min: 61, max: 90 },
      { clave: "mas", etiqueta: "Más de 90 días", min: 91, max: Infinity },
    ].map((ventana) => {
      const subset = rows.filter(
        (lot) =>
          lot.diasParaVencer !== null &&
          lot.diasParaVencer >= ventana.min &&
          lot.diasParaVencer <= ventana.max
      );
      return {
        clave: ventana.clave,
        etiqueta: ventana.etiqueta,
        lotes: subset.length,
        puntos: subset.reduce((total, lot) => total + lot.saldoLote, 0),
        afiliados: new Set(subset.map((lot) => lot.rootId)).size,
      };
    });

    // Ventanas y resumen se calculan sobre el conjunto completo, antes de paginar
    const resumen = {
      lotes: rows.length,
      puntos: rows.reduce((total, lot) => total + lot.saldoLote, 0),
      afiliados: new Set(rows.map((lot) => lot.rootId)).size,
      dias: days,
    };

    const { rows: pageRows, pagination } = paginate(rows, parsePagination(params));

    return NextResponse.json({
      rows: pageRows,
      pagination,
      ventanas,
      resumen,
      generadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/expiring] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error generando el informe",
      },
      { status: 502 }
    );
  }
}
