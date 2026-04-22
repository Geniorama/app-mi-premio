import { NextResponse } from "next/server";
import { getRedemptionById } from "@/lib/zoho";
import { sanityWriteClient, assertWriteClient } from "@/sanity/writeClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SanityRedemptionRow {
  _id: string;
  zohoRedemptionId: string;
  status: string;
  processedAt?: string | null;
}

type SanityStatus =
  | "pendiente"
  | "procesada"
  | "entregada"
  | "cancelada"
  | "rechazada";

const TERMINAL: SanityStatus[] = ["entregada", "cancelada", "rechazada"];

const PENDING_QUERY = `*[
  _type == "redemption" &&
  !(status in ["entregada","cancelada","rechazada"]) &&
  defined(zohoRedemptionId)
]{ _id, zohoRedemptionId, status, processedAt }`;

function normalize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Mapea el valor (texto libre) de la bitácora al status de Sanity.
 * Tolerante: normaliza tildes/mayúsculas y acepta variantes conocidas.
 * Si el valor no matchea, devuelve null y el caller lo loguea.
 */
function mapBitacoraToStatus(raw: unknown): SanityStatus | null {
  const n = normalize(raw);
  if (!n) return null;
  if (n.startsWith("entrega")) return "entregada";
  if (n.startsWith("aprob")) return "procesada";
  if (n.startsWith("rechaz")) return "rechazada";
  if (n.startsWith("cancel")) return "cancelada";
  return null;
}

/**
 * Fallback al campo principal Estado_Redencion cuando no hay bitácora útil.
 * Valores conocidos: "Creada", "Procesada".
 */
function mapEstadoRedencion(raw: unknown): SanityStatus | null {
  const n = normalize(raw);
  if (!n) return null;
  if (n.startsWith("proces")) return "procesada";
  if (n.startsWith("cread")) return "pendiente";
  return null;
}

function rowTimestamp(row: Record<string, unknown>): number {
  const candidates = ["Fecha_Movimiento", "Modified_Time", "Created_Time"];
  for (const k of candidates) {
    const v = row[k];
    if (typeof v === "string") {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

/**
 * Busca dentro del registro de Zoho el subformulario de bitácora.
 * Cada fila representa una transición (Estado_Anterior → Nuevo_Estado),
 * así que el estado actual es el `Nuevo_Estado` de la fila más reciente
 * (ordenando por Fecha_Movimiento; fallback a Modified_Time / Created_Time).
 */
function extractLatestBitacoraStatus(
  record: Record<string, unknown>
): { value: unknown; subformKey: string; statusKey: string } | null {
  for (const [key, value] of Object.entries(record)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const firstRow = value[0];
    if (!firstRow || typeof firstRow !== "object") continue;
    if (!/bit.*cora|bitacora/i.test(key)) continue;

    const rows = value as Array<Record<string, unknown>>;
    const sorted = [...rows].sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
    const latest = sorted[0];

    const preferredKeys = ["Nuevo_Estado", "Estado_Nuevo", "New_Status"];
    let statusKey = preferredKeys.find((k) => k in latest);
    if (!statusKey) {
      statusKey = Object.keys(latest).find(
        (k) =>
          /nuevo.*estado|new.*status/i.test(k) &&
          !/id$/i.test(k)
      );
    }
    if (!statusKey) {
      statusKey = Object.keys(latest).find(
        (k) =>
          /estado|status/i.test(k) &&
          !/anterior|previous|old|id$/i.test(k)
      );
    }
    if (!statusKey) continue;

    return { value: latest[statusKey], subformKey: key, statusKey };
  }
  return null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    assertWriteClient();
  } catch {
    return NextResponse.json(
      { error: "Servidor mal configurado (falta SANITY_API_WRITE_TOKEN)" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";

  const pending = await sanityWriteClient.fetch<SanityRedemptionRow[]>(
    PENDING_QUERY
  );

  const summary = {
    checked: pending.length,
    updated: 0,
    unchanged: 0,
    unknown: 0,
    missing: 0,
    errors: 0,
  };
  const unknownValues: Array<{ id: string; raw: unknown; source: string }> = [];
  const debugSamples: Array<Record<string, unknown>> = [];

  const tx = sanityWriteClient.transaction();
  let hasPatches = false;

  for (const row of pending) {
    let zohoRecord: Record<string, unknown> | null;
    try {
      zohoRecord = await getRedemptionById(row.zohoRedemptionId);
    } catch (err) {
      console.error(
        `[cron/sync-redemptions] Zoho GET falló para ${row.zohoRedemptionId}:`,
        err
      );
      summary.errors += 1;
      continue;
    }

    if (!zohoRecord) {
      summary.missing += 1;
      continue;
    }

    if (debug && debugSamples.length < 1) {
      debugSamples.push(zohoRecord);
    }

    const bitacora = extractLatestBitacoraStatus(zohoRecord);
    let next: SanityStatus | null = bitacora
      ? mapBitacoraToStatus(bitacora.value)
      : null;
    let source = bitacora ? `bitacora:${bitacora.subformKey}.${bitacora.statusKey}` : "";

    if (!next) {
      next = mapEstadoRedencion(zohoRecord.Estado_Redencion);
      if (next) source = "Estado_Redencion";
    }

    if (!next) {
      summary.unknown += 1;
      unknownValues.push({
        id: row.zohoRedemptionId,
        raw: bitacora?.value ?? zohoRecord.Estado_Redencion ?? null,
        source: bitacora ? `bitacora:${bitacora.subformKey}.${bitacora.statusKey}` : "Estado_Redencion",
      });
      continue;
    }

    if (next === row.status) {
      summary.unchanged += 1;
      continue;
    }

    const set: Record<string, string> = { status: next };
    const becomingProcessed =
      (next === "procesada" || TERMINAL.includes(next)) && !row.processedAt;
    if (becomingProcessed) {
      set.processedAt = new Date().toISOString();
    }

    tx.patch(row._id, (p) => p.set(set));
    hasPatches = true;
    summary.updated += 1;
    console.log(
      `[cron/sync-redemptions] ${row._id} ${row.status} -> ${next} (via ${source})`
    );
  }

  if (hasPatches) {
    try {
      await tx.commit({ autoGenerateArrayKeys: false });
    } catch (err) {
      console.error("[cron/sync-redemptions] Sanity transaction falló:", err);
      return NextResponse.json(
        { error: "Falló el commit en Sanity", summary },
        { status: 500 }
      );
    }
  }

  if (unknownValues.length > 0) {
    console.warn(
      "[cron/sync-redemptions] Valores de estado no mapeados:",
      JSON.stringify(unknownValues)
    );
  }

  return NextResponse.json({
    summary,
    unknownValues,
    ...(debug ? { debugSamples } : {}),
  });
}
