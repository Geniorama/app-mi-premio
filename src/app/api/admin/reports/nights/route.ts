import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";
import {
  buildAffiliateReport,
  listPointsLots,
  type PointsLotRow,
} from "@/lib/zoho-reports";
import { toCsv, csvResponse, formatDateTimeForCsv } from "@/lib/csv";
import { parsePagination, paginate } from "@/lib/pagination";
import { pointsToCop, pointsToNights, POINTS_PER_NIGHT } from "@/lib/points";
import { SIN_HOTEL } from "@/lib/hotels";
import { SIN_COMERCIAL } from "@/lib/comerciales";
import { inRange } from "@/lib/altas";
import { lastMonths, monthOf } from "@/lib/months";

/**
 * Noches vendidas por hotel y por comercial.
 *
 * Cada noche vendida genera `POINTS_PER_NIGHT` (400) puntos al afiliado, así
 * que las noches se deducen de los **puntos entregados**: no hay un campo de
 * noches en el CRM. La unidad es el lote de puntos (`listPointsLots`), que es
 * donde aparecen a la vez el hotel (`Entrega_OC`) y la fecha de entrega.
 *
 * El comercial no está en el lote: se resuelve por la red de membresía del
 * lote (`rootId`) contra el informe de afiliados, que ya trae el propietario
 * del contacto en Zoho. Es la misma asignación que usa el informe de
 * Comerciales, así que las dos vistas cuentan igual.
 *
 * El periodo filtra por `fechaEntrega`: una noche se cuenta el día en que se
 * cargaron sus puntos. Un lote sin fecha solo entra en "Todo el histórico".
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Meses que cubre la serie de noches. */
const SERIE_MESES = 12;

type Vista = "hotel" | "comercial" | "detalle";

interface NightsRow {
  /** Clave estable de la fila (hotel, id de comercial o ambos) */
  clave: string;
  /** Vacío en la vista por comercial */
  hotel: string;
  /** Vacío en la vista por hotel */
  comercial: string;
  comercialId: string;
  comercialEmail: string;
  noches: number;
  puntosEntregados: number;
  valorEntregadoCOP: number;
  lotes: number;
  /** Redes de membresía que recibieron esos puntos */
  afiliados: number;
  /** Hoteles distintos (vista por comercial) */
  hoteles: number;
  /** Comerciales distintos (vista por hotel) */
  comerciales: number;
  /** Fracción (0–1) de las noches de lo filtrado */
  participacion: number;
  ultimaEntrega: string | null;
}

interface Comercial {
  id: string;
  nombre: string;
  email: string;
}

const SIN_COMERCIAL_INFO: Comercial = { id: "", nombre: SIN_COMERCIAL, email: "" };

interface LoteConComercial extends PointsLotRow {
  comercial: Comercial;
}

function aggregate(
  clave: string,
  group: LoteConComercial[],
  totalNoches: number
): Omit<NightsRow, "hotel" | "comercial" | "comercialId" | "comercialEmail"> {
  const puntosEntregados = group.reduce((t, lot) => t + lot.puntosEntregados, 0);
  const noches = pointsToNights(puntosEntregados);
  const fechas = group
    .map((lot) => lot.fechaEntrega)
    .filter((fecha): fecha is string => Boolean(fecha))
    .sort();

  return {
    clave,
    noches,
    puntosEntregados,
    valorEntregadoCOP: pointsToCop(puntosEntregados),
    lotes: group.length,
    afiliados: new Set(group.map((lot) => lot.rootId)).size,
    hoteles: new Set(group.map((lot) => lot.hotel)).size,
    comerciales: new Set(group.map((lot) => lot.comercial.id)).size,
    participacion: totalNoches > 0 ? noches / totalNoches : 0,
    ultimaEntrega: fechas[fechas.length - 1] ?? null,
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group) group.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;

  const vistaParam = params.get("vista");
  const vista: Vista =
    vistaParam === "comercial" || vistaParam === "detalle" ? vistaParam : "hotel";
  const desde = params.get("desde") || null;
  const hasta = params.get("hasta") || null;
  const hotel = params.get("hotel") || null;
  // "sin" selecciona el grupo sin comercial, que no tiene id propio
  const comercialId = params.get("comercial") || null;

  try {
    const force = params.get("refresh") === "1";
    const [lots, report] = await Promise.all([
      listPointsLots(force),
      buildAffiliateReport(force),
    ]);

    // Red de membresía → comercial (propietario del contacto en Zoho)
    const comercialPorRed = new Map<string, Comercial>();
    for (const row of report.affiliates) {
      if (!row.rootId || !row.comercialId) continue;
      comercialPorRed.set(row.rootId, {
        id: row.comercialId,
        nombre: row.comercial,
        email: row.comercialEmail,
      });
    }

    const todos: LoteConComercial[] = lots
      .filter((lot) => lot.puntosEntregados > 0)
      .map((lot) => ({
        ...lot,
        comercial: comercialPorRed.get(lot.rootId) ?? SIN_COMERCIAL_INFO,
      }));

    // Opciones de los desplegables: todo el programa, al margen de los filtros,
    // para que elegir un hotel no haga desaparecer los demás de la lista.
    const hotelesDisponibles = [...new Set(todos.map((lot) => lot.hotel))]
      .filter((nombre) => nombre !== SIN_HOTEL)
      .sort((a, b) => a.localeCompare(b, "es"));
    const comercialesDisponibles = [
      ...new Map(
        todos
          .filter((lot) => lot.comercial.id)
          .map((lot) => [lot.comercial.id, lot.comercial.nombre])
      ),
    ]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    // -------------------------------------------------------------- filtros
    // Se filtran los lotes, no las filas: así cada vista (y la serie
    // mensual) habla exactamente de lo mismo.
    const ocultarSinHotel = params.get("sinHotel") === "0";
    const coincide = (lot: LoteConComercial) =>
      (!hotel || lot.hotel === hotel) &&
      (!comercialId ||
        (comercialId === "sin" ? !lot.comercial.id : lot.comercial.id === comercialId)) &&
      !(ocultarSinHotel && lot.hotel === SIN_HOTEL);

    const sinFechas = !desde && !hasta;
    const filtrados = todos.filter(
      (lot) => coincide(lot) && (sinFechas || inRange(lot.fechaEntrega, desde, hasta))
    );

    const totalNoches = pointsToNights(
      filtrados.reduce((t, lot) => t + lot.puntosEntregados, 0)
    );

    // ------------------------------------------------------------ agregación
    let rows: NightsRow[];
    if (vista === "comercial") {
      rows = [...groupBy(filtrados, (lot) => lot.comercial.id)].map(([id, group]) => ({
        ...aggregate(id || "sin", group, totalNoches),
        hotel: "",
        comercial: group[0].comercial.nombre,
        comercialId: id,
        comercialEmail: group[0].comercial.email,
      }));
    } else if (vista === "detalle") {
      rows = [
        ...groupBy(filtrados, (lot) => `${lot.hotel}\u0000${lot.comercial.id}`),
      ].map(([clave, group]) => ({
        ...aggregate(clave, group, totalNoches),
        hotel: group[0].hotel,
        comercial: group[0].comercial.nombre,
        comercialId: group[0].comercial.id,
        comercialEmail: group[0].comercial.email,
      }));
    } else {
      rows = [...groupBy(filtrados, (lot) => lot.hotel)].map(([nombre, group]) => ({
        ...aggregate(nombre, group, totalNoches),
        hotel: nombre,
        comercial: "",
        comercialId: "",
        comercialEmail: "",
      }));
    }

    const search = params.get("q")?.toLowerCase().trim();
    if (search) {
      rows = rows.filter((row) =>
        [row.hotel, row.comercial, row.comercialEmail]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    const orden = params.get("orden") ?? "noches";
    const nombre = (row: NightsRow) =>
      vista === "comercial" ? row.comercial : `${row.hotel} ${row.comercial}`;
    rows.sort((a, b) => {
      if (orden === "nombre") return nombre(a).localeCompare(nombre(b), "es");
      if (orden === "afiliados") return b.afiliados - a.afiliados || b.noches - a.noches;
      if (orden === "ultimaEntrega") {
        return (b.ultimaEntrega ?? "").localeCompare(a.ultimaEntrega ?? "");
      }
      return b.noches - a.noches;
    });

    // ---------------------------------------------------------------- salida
    // El CSV exporta todo lo filtrado, nunca solo la página visible.
    if (params.get("format") === "csv") {
      const csv = toCsv(rows, [
        ...(vista !== "comercial"
          ? [{ key: "hotel", header: "Hotel", value: (r: NightsRow) => r.hotel }]
          : []),
        ...(vista !== "hotel"
          ? [
              { key: "comercial", header: "Comercial", value: (r: NightsRow) => r.comercial },
              { key: "email", header: "Correo", value: (r: NightsRow) => r.comercialEmail },
            ]
          : []),
        { key: "noches", header: "Noches vendidas", value: (r) => r.noches.toFixed(1) },
        { key: "puntosEntregados", header: "Puntos entregados", value: (r) => r.puntosEntregados },
        { key: "valorEntregadoCOP", header: "Entregado (COP)", value: (r) => r.valorEntregadoCOP },
        { key: "lotes", header: "Lotes de puntos", value: (r) => r.lotes },
        { key: "afiliados", header: "Afiliados", value: (r) => r.afiliados },
        ...(vista === "hotel"
          ? [{ key: "comerciales", header: "Comerciales", value: (r: NightsRow) => r.comerciales }]
          : []),
        ...(vista === "comercial"
          ? [{ key: "hoteles", header: "Hoteles", value: (r: NightsRow) => r.hoteles }]
          : []),
        {
          key: "participacion",
          header: "Participación (%)",
          value: (r) => (r.participacion * 100).toFixed(2),
        },
        {
          key: "ultimaEntrega",
          header: "Última entrega",
          value: (r) => formatDateTimeForCsv(r.ultimaEntrega),
        },
      ]);

      return csvResponse(csv, `noches-por-${vista === "detalle" ? "hotel-y-comercial" : vista}`);
    }

    // Serie mensual sobre los lotes filtrados por hotel y comercial, pero no
    // por el periodo: la gráfica siempre enseña los últimos 12 meses.
    const meses = lastMonths(SERIE_MESES);
    const indicePorMes = new Map(meses.map((mes, index) => [mes, index]));
    const puntosPorMes = meses.map(() => 0);
    for (const lot of todos) {
      if (!coincide(lot)) continue;
      const index = indicePorMes.get(monthOf(lot.fechaEntrega));
      if (index !== undefined) puntosPorMes[index] += lot.puntosEntregados;
    }

    // El resumen se calcula sobre los lotes filtrados, antes de paginar
    const puntosEntregados = filtrados.reduce((t, lot) => t + lot.puntosEntregados, 0);
    const resumen = {
      noches: pointsToNights(puntosEntregados),
      puntosEntregados,
      lotes: filtrados.length,
      afiliados: new Set(filtrados.map((lot) => lot.rootId)).size,
      hoteles: new Set(filtrados.map((lot) => lot.hotel).filter((h) => h !== SIN_HOTEL)).size,
      comerciales: new Set(filtrados.map((lot) => lot.comercial.id).filter(Boolean)).size,
      /** Noches de lotes sin hotel identificable */
      nochesSinHotel: pointsToNights(
        filtrados
          .filter((lot) => lot.hotel === SIN_HOTEL)
          .reduce((t, lot) => t + lot.puntosEntregados, 0)
      ),
      /** Noches de afiliados sin propietario en el CRM */
      nochesSinComercial: pointsToNights(
        filtrados
          .filter((lot) => !lot.comercial.id)
          .reduce((t, lot) => t + lot.puntosEntregados, 0)
      ),
      /** Lotes cuyos puntos no son múltiplo exacto de una noche */
      lotesFraccionados: filtrados.filter(
        (lot) => lot.puntosEntregados % POINTS_PER_NIGHT !== 0
      ).length,
    };

    const { rows: pageRows, pagination } = paginate(rows, parsePagination(params));

    return NextResponse.json({
      vista,
      rows: pageRows,
      pagination,
      resumen,
      serieMensual: meses.map((mes, index) => ({
        mes,
        noches: pointsToNights(puntosPorMes[index]),
      })),
      // Se devuelve lo aplicado, no lo pedido
      rango: { desde, hasta },
      hotelesDisponibles,
      comercialesDisponibles,
      puntosPorNoche: POINTS_PER_NIGHT,
      padron: report.padron,
      generadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/nights] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error generando el informe",
      },
      { status: 502 }
    );
  }
}
