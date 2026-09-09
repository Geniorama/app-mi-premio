import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";
import { listPointsLots, type PointsLotRow } from "@/lib/zoho-reports";
import { toCsv, csvResponse } from "@/lib/csv";
import { pointsToCop } from "@/lib/points";
import { lastMonths, monthOf } from "@/lib/months";

/**
 * Ciclo de vida de los puntos: cargados → disponibles → redimidos / vencidos.
 *
 * Se arma sobre `listPointsLots` porque el lote es la única unidad que sabe
 * *cuándo* entró un punto y *cuándo* caduca; los agregados del módulo
 * `Membresias` dan el total pero no la fecha. Es la misma carga cacheada que
 * usan "Puntos por vencer" y "Hoteles", así que no añade coste en Zoho.
 *
 * La identidad que sostiene el informe, y que se verifica al final:
 *
 *   cargados = disponibles + redimidos + vencidos
 *
 * `saldoLote` ya es `entregados − redimidos` (con el consumo FIFO conciliado
 * contra el saldo real de la red), así que basta con separar los lotes vivos
 * de los caducados para que cierre.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Un lote caducado ya no es redimible: su saldo cuenta como vencido. */
const isExpired = (lot: PointsLotRow): boolean =>
  lot.diasParaVencer !== null && lot.diasParaVencer < 0;

/** Ventana en la que un punto vivo se considera "en riesgo". */
const RIESGO_DIAS = 90;

interface MonthRow {
  mes: string;
  /** Puntos entregados con fecha de entrega en ese mes */
  cargados: number;
  lotes: number;
  /** Puntos que caducaron sin usarse en ese mes */
  vencidos: number;
  /** De lo cargado ese mes, cuánto sigue vivo hoy */
  vivos: number;
  cargadosCOP: number;
  vencidosCOP: number;
}

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const meses = Math.min(Math.max(Number(params.get("meses")) || 12, 1), 36);

  try {
    const lots = await listPointsLots(params.get("refresh") === "1");

    const vivos = lots.filter((lot) => !isExpired(lot));
    const caducados = lots.filter(isExpired);

    const sum = (rows: PointsLotRow[], pick: (lot: PointsLotRow) => number) =>
      rows.reduce((total, lot) => total + pick(lot), 0);

    const cargados = sum(lots, (lot) => lot.puntosEntregados);
    const redimidos = sum(lots, (lot) => lot.puntosRedimidos);
    const disponibles = sum(vivos, (lot) => lot.saldoLote);
    const vencidos = sum(caducados, (lot) => lot.saldoLote);

    const enRiesgo = vivos.filter(
      (lot) => lot.diasParaVencer !== null && lot.diasParaVencer <= RIESGO_DIAS
    );

    // ------------------------------------------------------- serie mensual
    const months = lastMonths(meses);
    const byMonth = new Map<string, MonthRow>(
      months.map((mes) => [
        mes,
        {
          mes,
          cargados: 0,
          lotes: 0,
          vencidos: 0,
          vivos: 0,
          cargadosCOP: 0,
          vencidosCOP: 0,
        },
      ])
    );

    for (const lot of lots) {
      // Un lote suma en el mes en que se cargó…
      const entrega = byMonth.get(monthOf(lot.fechaEntrega));
      if (entrega) {
        entrega.cargados += lot.puntosEntregados;
        entrega.lotes += 1;
        if (!isExpired(lot)) entrega.vivos += lot.saldoLote;
      }

      // …y, si caducó sin usarse, resta en el mes en que venció
      if (isExpired(lot) && lot.saldoLote > 0) {
        const vencimiento = byMonth.get(monthOf(lot.fechaVencimiento));
        if (vencimiento) vencimiento.vencidos += lot.saldoLote;
      }
    }

    const serieMensual = [...byMonth.values()].map((row) => ({
      ...row,
      cargadosCOP: pointsToCop(row.cargados),
      vencidosCOP: pointsToCop(row.vencidos),
    }));

    // --------------------------------------------- reparto por estado del lote
    const byEstado = new Map<string, { estado: string; lotes: number; puntos: number }>();
    for (const lot of lots) {
      const estado = lot.estado?.trim() || "Sin estado";
      const bucket = byEstado.get(estado) ?? { estado, lotes: 0, puntos: 0 };
      bucket.lotes += 1;
      bucket.puntos += lot.puntosEntregados;
      byEstado.set(estado, bucket);
    }

    // ---------------------------------------------------------------- salida
    if (params.get("format") === "csv") {
      const csv = toCsv(serieMensual, [
        { key: "mes", header: "Mes", value: (r) => r.mes },
        { key: "lotes", header: "Lotes cargados", value: (r) => r.lotes },
        { key: "cargados", header: "Puntos cargados", value: (r) => r.cargados },
        // Sin símbolo ni separadores: así Excel lo trata como número
        { key: "cargadosCOP", header: "Cargado (COP)", value: (r) => r.cargadosCOP },
        { key: "vivos", header: "Todavía disponibles", value: (r) => r.vivos },
        { key: "vencidos", header: "Puntos vencidos", value: (r) => r.vencidos },
        { key: "vencidosCOP", header: "Vencido (COP)", value: (r) => r.vencidosCOP },
      ]);

      return csvResponse(csv, "puntos");
    }

    // Si esto no cierra, el informe está mintiendo: mejor saberlo en el log.
    const descuadre = cargados - (disponibles + redimidos + vencidos);
    if (descuadre !== 0) {
      console.warn(
        `[admin/points] Los lotes no cuadran por ${descuadre} puntos ` +
          `(cargados ${cargados}, disponibles ${disponibles}, ` +
          `redimidos ${redimidos}, vencidos ${vencidos}).`
      );
    }

    return NextResponse.json({
      resumen: {
        cargados,
        disponibles,
        redimidos,
        vencidos,
        enRiesgo: sum(enRiesgo, (lot) => lot.saldoLote),
        riesgoDias: RIESGO_DIAS,
        lotes: lots.length,
        afiliados: new Set(lots.map((lot) => lot.rootId)).size,
        /** Debe ser 0; se expone para no esconder una inconsistencia del CRM */
        descuadre,
      },
      serieMensual,
      porEstado: [...byEstado.values()].sort((a, b) => b.puntos - a.puntos),
      generadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/points] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error generando el informe",
      },
      { status: 502 }
    );
  }
}
