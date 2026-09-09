import { NextResponse } from "next/server";
import { warmReportsCache } from "@/lib/zoho-reports";

/**
 * Precalienta la caché de los informes del panel.
 *
 * El informe de lotes (Puntos, Puntos por vencer y Hoteles) recorre Zoho
 * membresía por membresía: unos 7 segundos que alguien tiene que pagar. Este
 * cron los paga en frío para que el administrador siempre llegue a una caché
 * caliente.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET`, el mismo esquema que
 * `sync-redemptions` y el que envía el cron de Vercel cuando `CRON_SECRET`
 * está definida en el entorno.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== expected
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await warmReportsCache();

  const detalle = result.cargas
    .map(
      (carga) =>
        `${carga.clave}: ${carga.registros} en ${carga.ms} ms` +
        (carga.error ? ` — ERROR: ${carga.error}` : "")
    )
    .join(" | ");

  if (result.ok) {
    console.log(`[cron/warm-reports] Caché lista en ${result.ms} ms. ${detalle}`);
  } else {
    console.error(
      `[cron/warm-reports] Caché incompleta tras ${result.ms} ms. ${detalle}`
    );
  }

  // El 500 es deliberado: así una caída de Zoho sale marcada en el panel de
  // ejecuciones del cron en vez de pasar por una corrida más.
  return NextResponse.json(
    { ...result, generadoEn: new Date().toISOString() },
    { status: result.ok ? 200 : 500 }
  );
}
