import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";
import { listPointsLots } from "@/lib/zoho-reports";
import { toCsv, csvResponse, formatDateTimeForCsv } from "@/lib/csv";
import { parsePagination, paginate } from "@/lib/pagination";
import { pointsToCop } from "@/lib/points";
import { SIN_HOTEL } from "@/lib/hotels";

/**
 * Informe por hotel.
 *
 * Los puntos se emiten contra una orden de compra del hotel, y el hotel solo
 * aparece dentro del nombre de ese lookup (`Entrega_OC`) en el subformulario
 * `Puntos_Membresia`. Es decir: la unidad con hotel es el **lote de puntos**,
 * no la redención.
 *
 * Por eso este informe se arma sobre `listPointsLots`, la misma carga que usa
 * "Puntos por vencer" (un GET por membresía, cacheado 15 minutos): pedir el
 * dato aparte duplicaría el informe más caro del panel sin añadir nada.
 *
 * Sobre los redimidos: los puntos son fungibles y el programa los consume
 * FIFO, así que lo que se atribuye a un hotel es *cuánto de lo que emitió ya
 * se gastó*, siguiendo ese mismo orden. No es "el afiliado canjeó este bono
 * gracias a este hotel" — esa trazabilidad no existe en el CRM.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface HotelRow {
  hotel: string;
  /** Lotes de puntos emitidos por el hotel */
  lotes: number;
  puntosEntregados: number;
  puntosRedimidos: number;
  /** Entregados − redimidos: lo que sigue vivo */
  saldoVivo: number;
  puntosVencidos: number;
  /** Redes de membresía (afiliados) que recibieron puntos del hotel */
  afiliados: number;
  membresias: number;
  primeraEntrega: string | null;
  ultimaEntrega: string | null;
  /** Puntos entregados convertidos a pesos */
  valorEntregadoCOP: number;
  valorRedimidoCOP: number;
  /** Porcentaje de los puntos del programa emitidos por este hotel */
  participacion: number;
}

/** Un lote vencido ya no es redimible: su saldo no cuenta como vivo. */
const isExpired = (dias: number | null): boolean => dias !== null && dias < 0;

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;

  try {
    const lots = await listPointsLots(params.get("refresh") === "1");

    // ------------------------------------------------------------ agregación
    const byHotel = new Map<string, typeof lots>();
    for (const lot of lots) {
      const group = byHotel.get(lot.hotel);
      if (group) group.push(lot);
      else byHotel.set(lot.hotel, [lot]);
    }

    const totalEntregado = lots.reduce((total, lot) => total + lot.puntosEntregados, 0);

    let rows: HotelRow[] = [...byHotel].map(([hotel, group]) => {
      const puntosEntregados = group.reduce((t, lot) => t + lot.puntosEntregados, 0);
      const puntosRedimidos = group.reduce((t, lot) => t + lot.puntosRedimidos, 0);
      const vencidos = group.filter((lot) => isExpired(lot.diasParaVencer));

      const fechas = group
        .map((lot) => lot.fechaEntrega)
        .filter((fecha): fecha is string => Boolean(fecha))
        .sort();

      return {
        hotel,
        lotes: group.length,
        puntosEntregados,
        puntosRedimidos,
        saldoVivo: group
          .filter((lot) => !isExpired(lot.diasParaVencer))
          .reduce((t, lot) => t + lot.saldoLote, 0),
        puntosVencidos: vencidos.reduce((t, lot) => t + lot.saldoLote, 0),
        afiliados: new Set(group.map((lot) => lot.rootId)).size,
        membresias: new Set(group.map((lot) => lot.membershipId)).size,
        primeraEntrega: fechas[0] ?? null,
        ultimaEntrega: fechas[fechas.length - 1] ?? null,
        valorEntregadoCOP: pointsToCop(puntosEntregados),
        valorRedimidoCOP: pointsToCop(puntosRedimidos),
        participacion: totalEntregado > 0 ? puntosEntregados / totalEntregado : 0,
      };
    });

    // -------------------------------------------------------------- filtros
    const search = params.get("q")?.toLowerCase().trim();
    if (search) rows = rows.filter((row) => row.hotel.toLowerCase().includes(search));

    // Los lotes sin hotel no son un hotel: se pueden esconder del listado
    if (params.get("sinHotel") === "0") {
      rows = rows.filter((row) => row.hotel !== SIN_HOTEL);
    }

    const orden = params.get("orden") ?? "puntosEntregados";
    rows.sort((a, b) => {
      if (orden === "hotel") return a.hotel.localeCompare(b.hotel, "es");
      if (orden === "puntosRedimidos") return b.puntosRedimidos - a.puntosRedimidos;
      if (orden === "saldoVivo") return b.saldoVivo - a.saldoVivo;
      if (orden === "afiliados") return b.afiliados - a.afiliados;
      return b.puntosEntregados - a.puntosEntregados;
    });

    // ---------------------------------------------------------------- salida
    // El CSV exporta todo lo filtrado, nunca solo la página visible.
    if (params.get("format") === "csv") {
      const csv = toCsv(rows, [
        { key: "hotel", header: "Hotel", value: (r) => r.hotel },
        { key: "lotes", header: "Lotes de puntos", value: (r) => r.lotes },
        { key: "afiliados", header: "Afiliados", value: (r) => r.afiliados },
        { key: "membresias", header: "Membresías", value: (r) => r.membresias },
        { key: "puntosEntregados", header: "Puntos entregados", value: (r) => r.puntosEntregados },
        // Sin símbolo ni separadores: así Excel lo trata como número
        { key: "valorEntregadoCOP", header: "Entregado (COP)", value: (r) => r.valorEntregadoCOP },
        { key: "puntosRedimidos", header: "Puntos redimidos", value: (r) => r.puntosRedimidos },
        { key: "valorRedimidoCOP", header: "Redimido (COP)", value: (r) => r.valorRedimidoCOP },
        { key: "saldoVivo", header: "Saldo vivo", value: (r) => r.saldoVivo },
        { key: "puntosVencidos", header: "Puntos vencidos", value: (r) => r.puntosVencidos },
        {
          key: "participacion",
          header: "Participación (%)",
          value: (r) => (r.participacion * 100).toFixed(2),
        },
        {
          key: "primeraEntrega",
          header: "Primera entrega",
          value: (r) => formatDateTimeForCsv(r.primeraEntrega),
        },
        {
          key: "ultimaEntrega",
          header: "Última entrega",
          value: (r) => formatDateTimeForCsv(r.ultimaEntrega),
        },
      ]);

      return csvResponse(csv, "hoteles");
    }

    // El resumen se calcula sobre el conjunto completo, antes de paginar
    const resumen = {
      hoteles: rows.filter((row) => row.hotel !== SIN_HOTEL).length,
      puntosEntregados: rows.reduce((t, r) => t + r.puntosEntregados, 0),
      puntosRedimidos: rows.reduce((t, r) => t + r.puntosRedimidos, 0),
      saldoVivo: rows.reduce((t, r) => t + r.saldoVivo, 0),
      lotes: rows.reduce((t, r) => t + r.lotes, 0),
      sinHotel: rows.find((row) => row.hotel === SIN_HOTEL)?.puntosEntregados ?? 0,
    };

    const { rows: pageRows, pagination } = paginate(rows, parsePagination(params));

    return NextResponse.json({
      rows: pageRows,
      pagination,
      resumen,
      generadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/hotels] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error generando el informe",
      },
      { status: 502 }
    );
  }
}
