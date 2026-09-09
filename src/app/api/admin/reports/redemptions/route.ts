import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireActiveAdmin } from "@/lib/admin";
import { buildAffiliateReport } from "@/lib/zoho-reports";
import { sanityFreshClient } from "@/sanity/client";
import { redemptionsAuditQuery } from "@/sanity/queries";
import { toCsv, csvResponse, formatDateTimeForCsv } from "@/lib/csv";
import { parsePagination, paginate } from "@/lib/pagination";
import { pointsToCop } from "@/lib/points";
import {
  groupRedemptions,
  type RedemptionReportRow,
} from "@/lib/redemption-groups";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface AuditDoc {
  zohoRedemptionId?: string;
  voucherTitle?: string;
  voucherSlug?: string;
  voucherCategory?: string;
  voucherPoints?: number;
  status?: string;
  deliveryEmail?: string;
  deliveryCode?: string;
  processedAt?: string;
  redeemedAt?: string;
  email?: string;
}

export async function GET(request: NextRequest) {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const force = params.get("refresh") === "1";

  try {
    const [report, audit] = await Promise.all([
      buildAffiliateReport(force),
      sanityFreshClient
        .fetch<AuditDoc[]>(redemptionsAuditQuery)
        .catch((error) => {
          console.error("[admin/redemptions] Sanity no respondió:", error);
          return [] as AuditDoc[];
        }),
    ]);

    const auditById = new Map(
      audit
        .filter((doc) => doc.zohoRedemptionId)
        .map((doc) => [doc.zohoRedemptionId as string, doc])
    );

    let rows: RedemptionReportRow[] = report.redemptions.map((redemption) => {
      const doc = auditById.get(redemption.id);

      return {
        id: redemption.id,
        ids: [redemption.id],
        nombre: redemption.nombre,
        nombres: [redemption.nombre],
        tramos: 1,
        afiliado: redemption.afiliado,
        email: redemption.email,
        rootId: redemption.rootId,
        membresiaId: redemption.membresiaId,
        membresiaIds: [redemption.membresiaId],
        membresia: redemption.membresiaNombre,
        membresias: [redemption.membresiaNombre],
        puntos: redemption.puntos,
        estado: redemption.estado,
        estadoRaw: redemption.estadoRaw,
        estadoMixto: false,
        fecha: redemption.fecha,
        bono: doc?.voucherTitle ?? "",
        bonoSlug: doc?.voucherSlug ?? "",
        bonoPuntos: doc?.voucherPoints ?? 0,
        categoria: doc?.voucherCategory ?? "",
        estadoEntrega: doc?.status ?? "",
        correoEntrega: doc?.deliveryEmail ?? doc?.email ?? "",
        procesadaEn: doc?.processedAt ?? null,
        origenWeb: Boolean(doc),
      };
    });

    // Un bono = una fila, aunque Zoho lo haya partido en varios registros.
    // Se agrupa antes de filtrar para que el resumen y la paginación cuenten
    // bonos, no tramos.
    rows = groupRedemptions(rows);
    rows.sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));

    // -------------------------------------------------------------- filtros
    const from = params.get("from");
    const to = params.get("to");
    const estado = params.get("estado");
    const bono = params.get("bono");
    const origen = params.get("origen"); // "web" | "crm"
    const search = params.get("q")?.toLowerCase().trim();

    if (from) rows = rows.filter((row) => (row.fecha ?? "") >= from);
    // `to` es un día completo: se compara contra el final de esa fecha
    if (to) rows = rows.filter((row) => (row.fecha ?? "") <= `${to}T23:59:59`);
    if (estado) rows = rows.filter((row) => row.estado === estado);
    if (bono) rows = rows.filter((row) => row.bonoSlug === bono);
    if (origen === "web") rows = rows.filter((row) => row.origenWeb);
    if (origen === "crm") rows = rows.filter((row) => !row.origenWeb);

    if (search) {
      rows = rows.filter((row) =>
        [row.nombre, row.afiliado, row.email, row.membresia, row.bono]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    // ---------------------------------------------------------------- salida
    // El CSV exporta todo lo filtrado, nunca solo la página visible.
    if (params.get("format") === "csv") {
      const csv = toCsv(rows, [
        { key: "nombre", header: "Redención", value: (r) => r.nombre },
        { key: "fecha", header: "Fecha", value: (r) => formatDateTimeForCsv(r.fecha) },
        { key: "afiliado", header: "Afiliado", value: (r) => r.afiliado },
        { key: "email", header: "Correo", value: (r) => r.email },
        { key: "membresia", header: "Membresía", value: (r) => r.membresia },
        { key: "puntos", header: "Puntos", value: (r) => r.puntos },
        // Sin símbolo ni separadores: así Excel lo trata como número
        { key: "valorCOP", header: "Valor (COP)", value: (r) => pointsToCop(r.puntos) },
        { key: "tramos", header: "Registros en Zoho", value: (r) => r.tramos },
        {
          key: "nombres",
          header: "Redenciones en Zoho",
          value: (r) => r.nombres.join(" | "),
        },
        { key: "estadoRaw", header: "Estado en Zoho", value: (r) => r.estadoRaw },
        { key: "bono", header: "Bono", value: (r) => r.bono },
        { key: "categoria", header: "Categoría", value: (r) => r.categoria },
        { key: "estadoEntrega", header: "Estado de entrega", value: (r) => r.estadoEntrega },
        { key: "correoEntrega", header: "Correo de entrega", value: (r) => r.correoEntrega },
        {
          key: "procesadaEn",
          header: "Procesada en",
          value: (r) => formatDateTimeForCsv(r.procesadaEn),
        },
        { key: "origenWeb", header: "Origen", value: (r) => (r.origenWeb ? "Web" : "CRM") },
      ]);

      return csvResponse(csv, "redenciones");
    }

    // El resumen se calcula sobre el conjunto completo, antes de paginar
    const totalPuntos = rows.reduce((total, row) => total + row.puntos, 0);
    const porEstado: Record<string, number> = {};
    for (const row of rows) porEstado[row.estado] = (porEstado[row.estado] ?? 0) + 1;

    const resumen = {
      redenciones: rows.length,
      puntos: totalPuntos,
      porEstado,
      desdeWeb: rows.filter((row) => row.origenWeb).length,
      valorCOP: pointsToCop(totalPuntos),
      // Cuántos registros hay realmente en Zoho detrás de esas redenciones,
      // para poder cuadrar el informe con el CRM.
      registrosZoho: rows.reduce((total, row) => total + row.tramos, 0),
    };

    const { rows: pageRows, pagination } = paginate(rows, parsePagination(params));

    return NextResponse.json({
      rows: pageRows,
      pagination,
      resumen,
      generadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/redemptions] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error generando el informe",
      },
      { status: 502 }
    );
  }
}
