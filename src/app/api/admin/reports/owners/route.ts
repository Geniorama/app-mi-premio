import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";
import {
  buildAffiliateReport,
  listPointsLots,
  type AffiliateReportRow,
} from "@/lib/zoho-reports";
import { toCsv, csvResponse, formatDateTimeForCsv } from "@/lib/csv";
import { parsePagination, paginate } from "@/lib/pagination";
import { pointsToCop } from "@/lib/points";
import { SIN_COMERCIAL } from "@/lib/comerciales";
import { altaByNetwork, inRange } from "@/lib/altas";
import { lastMonths, monthOf } from "@/lib/months";

/**
 * Informe por comercial.
 *
 * El comercial de un afiliado es el **propietario del contacto** en Zoho
 * (`Owner`): la asignación que ya mantiene el equipo en el CRM. Este informe
 * no la reinterpreta, solo la agrega.
 *
 * Se arma sobre `buildAffiliateReport` —la misma carga que ya alimenta
 * Afiliados y Resumen, cacheada 5 minutos— porque la fila de afiliado ya trae
 * puntos, saldo, redenciones y comercial resueltos. Pedir Contacts aparte para
 * esto duplicaría la lectura sin añadir un solo dato.
 *
 * Ojo con qué se está contando: la unidad es la **red de membresía**, no el
 * contacto. Un contacto con dos redes suma dos filas de afiliado, así que
 * `afiliados` cuenta redes y `contactos` cuenta personas distintas.
 *
 * **Altas.** La fecha de alta es la del primer lote de puntos del afiliado
 * (ver `lib/altas.ts`: Zoho no guarda una fecha de inscripción). Eso obliga a
 * cargar también `listPointsLots`, que es la lectura cara del panel (≈320 GET,
 * 7-9 s en frío). Va cacheada 35 min y la precalienta el temporizador de
 * arranque, así que en la práctica está caliente; de ahí el `maxDuration` de
 * 300, igual que Hoteles y Puntos por vencer.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Meses que cubre la serie de altas de cada comercial. */
const SERIE_MESES = 12;

interface OwnerRow {
  /** Id del usuario de Zoho; vacío en el grupo sin comercial */
  comercialId: string;
  comercial: string;
  email: string;
  /** Filas del informe de afiliados atribuidas al comercial (redes + sueltos) */
  afiliados: number;
  /** Personas distintas del CRM, que es lo que de verdad gestiona */
  contactos: number;
  conMembresia: number;
  /** Contactos suyos que están en el CRM pero nunca recibieron puntos */
  sinMembresia: number;
  conSaldo: number;
  conRedenciones: number;
  empresas: number;
  puntosEntregados: number;
  puntosRedimidos: number;
  saldoDisponible: number;
  puntosVencidos: number;
  puntosPorVencer: number;
  redenciones: number;
  /** Afiliados que recibieron sus primeros puntos dentro del rango pedido */
  altas: number;
  /**
   * Afiliados suyos sin fecha de alta porque nunca recibieron puntos. No
   * entran en ninguna serie ni en ningún rango: no hay fecha que contar.
   */
  sinAlta: number;
  /** Altas de cada uno de los últimos 12 meses, del más antiguo al más nuevo */
  serie: number[];
  /** Fecha del alta más reciente, esté o no dentro del rango */
  ultimaAlta: string | null;
  valorEntregadoCOP: number;
  valorRedimidoCOP: number;
  /** Fracción (0–1) de los puntos entregados del programa */
  participacion: number;
  /** Redimidos ÷ entregados: cuánto de lo que le cargaron ya se usó */
  tasaRedencion: number;
  /** Fracción de sus afiliados que ha redimido al menos una vez */
  tasaActivacion: number;
  ultimaRedencion: string | null;
  ultimaActividad: string | null;
}

const sum = (rows: AffiliateReportRow[], pick: (row: AffiliateReportRow) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

/** La más reciente de una lista de fechas ISO, ignorando las vacías. */
function latest(values: Array<string | null>): string | null {
  const fechas = values.filter((value): value is string => Boolean(value)).sort();
  return fechas[fechas.length - 1] ?? null;
}

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;

  // Rango de altas. Sin límites cuenta el histórico completo; el panel manda
  // siempre los últimos 12 meses salvo que se elija otra cosa.
  const desde = params.get("desde") || null;
  const hasta = params.get("hasta") || null;

  try {
    const force = params.get("refresh") === "1";
    const [report, lots] = await Promise.all([
      buildAffiliateReport(force),
      // Sin lotes no hay fechas de alta, pero el resto del informe sigue
      // sirviendo: se degrada a cero altas en vez de caerse entero.
      listPointsLots(force).catch((error) => {
        console.error("[admin/owners] No se pudieron listar los lotes:", error);
        return [];
      }),
    ]);

    const altasPorRed = altaByNetwork(lots);
    const meses = lastMonths(SERIE_MESES);
    const indicePorMes = new Map(meses.map((mes, index) => [mes, index]));

    // ------------------------------------------------------------ agregación
    const byOwner = new Map<string, AffiliateReportRow[]>();
    for (const affiliate of report.affiliates) {
      // La clave es el id del usuario de Zoho, no el nombre: dos comerciales
      // homónimos son dos filas, y un cambio de nombre en el CRM no parte el
      // histórico en dos.
      const key = affiliate.comercialId || SIN_COMERCIAL;
      const group = byOwner.get(key);
      if (group) group.push(affiliate);
      else byOwner.set(key, [affiliate]);
    }

    const totalEntregado = sum(report.affiliates, (row) => row.puntosEntregados);

    let rows: OwnerRow[] = [...byOwner].map(([key, group]) => {
      const puntosEntregados = sum(group, (row) => row.puntosEntregados);
      const puntosRedimidos = sum(group, (row) => row.puntosRedimidos);
      const conRedenciones = group.filter((row) => row.redenciones > 0).length;
      const identificado = group.find((row) => row.comercial) ?? null;

      // Altas del comercial: una por red que estrenó puntos. Las redes sin
      // lote no tienen fecha, así que no cuentan en ningún periodo.
      const serie = meses.map(() => 0);
      const fechasAlta: string[] = [];
      let altas = 0;
      let sinAlta = 0;

      for (const affiliate of group) {
        const alta = altasPorRed.get(affiliate.rootId);
        if (!alta) {
          sinAlta++;
          continue;
        }

        fechasAlta.push(alta);
        if (inRange(alta, desde, hasta)) altas++;

        const index = indicePorMes.get(monthOf(alta));
        if (index !== undefined) serie[index]++;
      }

      fechasAlta.sort();

      return {
        altas,
        sinAlta,
        serie,
        ultimaAlta: fechasAlta[fechasAlta.length - 1] ?? null,
        comercialId: key === SIN_COMERCIAL ? "" : key,
        comercial: identificado?.comercial ?? SIN_COMERCIAL,
        email: identificado?.comercialEmail ?? "",
        afiliados: group.length,
        contactos: new Set(group.map((row) => row.contactId).filter(Boolean)).size,
        conMembresia: group.filter((row) => row.conMembresia).length,
        sinMembresia: group.filter((row) => !row.conMembresia).length,
        conSaldo: group.filter((row) => row.saldoDisponible > 0).length,
        conRedenciones,
        empresas: new Set(group.map((row) => row.empresa).filter(Boolean)).size,
        puntosEntregados,
        puntosRedimidos,
        saldoDisponible: sum(group, (row) => row.saldoDisponible),
        puntosVencidos: sum(group, (row) => row.puntosVencidos),
        puntosPorVencer: sum(group, (row) => row.puntosPorVencer),
        redenciones: sum(group, (row) => row.redenciones),
        valorEntregadoCOP: pointsToCop(puntosEntregados),
        valorRedimidoCOP: pointsToCop(puntosRedimidos),
        participacion: totalEntregado > 0 ? puntosEntregados / totalEntregado : 0,
        tasaRedencion: puntosEntregados > 0 ? puntosRedimidos / puntosEntregados : 0,
        tasaActivacion: group.length > 0 ? conRedenciones / group.length : 0,
        ultimaRedencion: latest(group.map((row) => row.ultimaRedencion)),
        ultimaActividad: latest(group.map((row) => row.ultimaActividad)),
      };
    });

    // -------------------------------------------------------------- filtros
    const search = params.get("q")?.toLowerCase().trim();
    if (search) {
      rows = rows.filter((row) =>
        `${row.comercial} ${row.email}`.toLowerCase().includes(search)
      );
    }

    // El grupo sin comercial no es un comercial: se puede esconder del listado
    if (params.get("sinComercial") === "0") {
      rows = rows.filter((row) => row.comercialId !== "");
    }

    const orden = params.get("orden") ?? "puntosEntregados";
    rows.sort((a, b) => {
      if (orden === "comercial") return a.comercial.localeCompare(b.comercial, "es");
      if (orden === "afiliados") return b.afiliados - a.afiliados;
      if (orden === "altas") return b.altas - a.altas;
      if (orden === "puntosRedimidos") return b.puntosRedimidos - a.puntosRedimidos;
      if (orden === "saldoDisponible") return b.saldoDisponible - a.saldoDisponible;
      if (orden === "tasaRedencion") return b.tasaRedencion - a.tasaRedencion;
      if (orden === "tasaActivacion") return b.tasaActivacion - a.tasaActivacion;
      return b.puntosEntregados - a.puntosEntregados;
    });

    // ---------------------------------------------------------------- salida
    // El CSV exporta todo lo filtrado, nunca solo la página visible.
    if (params.get("format") === "csv") {
      const csv = toCsv(rows, [
        { key: "comercial", header: "Comercial", value: (r) => r.comercial },
        { key: "email", header: "Correo", value: (r) => r.email },
        { key: "contactos", header: "Contactos", value: (r) => r.contactos },
        { key: "afiliados", header: "Afiliados (redes)", value: (r) => r.afiliados },
        { key: "conMembresia", header: "Con membresía", value: (r) => r.conMembresia },
        { key: "sinMembresia", header: "Sin membresía", value: (r) => r.sinMembresia },
        { key: "empresas", header: "Empresas", value: (r) => r.empresas },
        { key: "conSaldo", header: "Con saldo", value: (r) => r.conSaldo },
        { key: "conRedenciones", header: "Han redimido", value: (r) => r.conRedenciones },
        { key: "altas", header: "Altas en el periodo", value: (r) => r.altas },
        // Una columna por mes: es lo que permite dibujar la evolución en Excel
        ...meses.map((mes, index) => ({
          key: `alta-${mes}`,
          header: `Altas ${mes}`,
          value: (r: OwnerRow) => r.serie[index] ?? 0,
        })),
        {
          key: "ultimaAlta",
          header: "Última alta",
          value: (r) => formatDateTimeForCsv(r.ultimaAlta),
        },
        {
          key: "puntosEntregados",
          header: "Puntos entregados",
          value: (r) => r.puntosEntregados,
        },
        // Sin símbolo ni separadores: así Excel lo trata como número
        {
          key: "valorEntregadoCOP",
          header: "Entregado (COP)",
          value: (r) => r.valorEntregadoCOP,
        },
        {
          key: "puntosRedimidos",
          header: "Puntos redimidos",
          value: (r) => r.puntosRedimidos,
        },
        {
          key: "valorRedimidoCOP",
          header: "Redimido (COP)",
          value: (r) => r.valorRedimidoCOP,
        },
        {
          key: "saldoDisponible",
          header: "Saldo disponible",
          value: (r) => r.saldoDisponible,
        },
        {
          key: "puntosPorVencer",
          header: "Puntos por vencer",
          value: (r) => r.puntosPorVencer,
        },
        { key: "puntosVencidos", header: "Puntos vencidos", value: (r) => r.puntosVencidos },
        { key: "redenciones", header: "Redenciones", value: (r) => r.redenciones },
        {
          key: "tasaRedencion",
          header: "Tasa de redención (%)",
          value: (r) => (r.tasaRedencion * 100).toFixed(2),
        },
        {
          key: "tasaActivacion",
          header: "Afiliados activados (%)",
          value: (r) => (r.tasaActivacion * 100).toFixed(2),
        },
        {
          key: "participacion",
          header: "Participación (%)",
          value: (r) => (r.participacion * 100).toFixed(2),
        },
        {
          key: "ultimaRedencion",
          header: "Última redención",
          value: (r) => formatDateTimeForCsv(r.ultimaRedencion),
        },
      ]);

      return csvResponse(csv, "comerciales");
    }

    // El resumen se calcula sobre el conjunto completo, antes de paginar
    const entregado = rows.reduce((t, r) => t + r.puntosEntregados, 0);
    const redimido = rows.reduce((t, r) => t + r.puntosRedimidos, 0);

    const resumen = {
      comerciales: rows.filter((row) => row.comercialId !== "").length,
      afiliados: rows.reduce((t, r) => t + r.afiliados, 0),
      altas: rows.reduce((t, r) => t + r.altas, 0),
      /** Altas del último mes de la serie, sea cual sea el rango elegido */
      altasMesActual: rows.reduce((t, r) => t + (r.serie[SERIE_MESES - 1] ?? 0), 0),
      /**
       * Afiliados del padrón que todavía no han recibido puntos: no tienen
       * fecha de alta, así que no entran en ninguna serie ni en el rango.
       */
      sinAlta: rows.reduce((t, r) => t + r.sinAlta, 0),
      puntosEntregados: entregado,
      puntosRedimidos: redimido,
      saldoDisponible: rows.reduce((t, r) => t + r.saldoDisponible, 0),
      tasaRedencion: entregado > 0 ? redimido / entregado : 0,
      /** Afiliados sin comercial identificado, para poder depurarlo en Zoho */
      sinComercial: rows.find((row) => row.comercialId === "")?.afiliados ?? 0,
    };

    const { rows: pageRows, pagination } = paginate(rows, parsePagination(params));

    return NextResponse.json({
      rows: pageRows,
      pagination,
      resumen,
      meses,
      // Se suma sobre las filas ya filtradas, no sobre el programa entero: si
      // se busca un comercial, el gráfico tiene que hablar de ese comercial.
      serieAltas: meses.map((mes, index) => ({
        mes,
        altas: rows.reduce((total, row) => total + (row.serie[index] ?? 0), 0),
      })),
      // Se devuelve lo aplicado, no lo pedido: el panel pinta el encabezado
      // del periodo con esto y así nunca miente sobre lo que está contando.
      rango: { desde, hasta },
      // Si Contacts no se pudo leer, todos los afiliados caen en "sin
      // comercial" y el informe entero mentiría sin decirlo.
      padron: report.padron,
      generadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/owners] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error generando el informe",
      },
      { status: 502 }
    );
  }
}
