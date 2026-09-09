/**
 * Precalentado periódico de la caché de informes, dentro del propio proceso.
 *
 * La app corre en un proceso largo (`next start` en EC2/ECS/App Runner), y la
 * caché de `zoho-reports` vive en la memoria de ese proceso. Por eso el
 * precalentado va aquí y no en un cron externo: un scheduler que llame por HTTP
 * calienta la instancia que le toque en el balanceador, mientras que este
 * temporizador calienta **siempre** la memoria que atiende las peticiones de
 * esa réplica. Si mañana hay tres tareas en ECS, cada una calienta la suya, que
 * es justo lo que hace falta.
 *
 * El endpoint `/api/cron/warm-reports` sigue existiendo para forzarlo a mano
 * (después de un despliegue, o al depurar); no es necesario para la operación
 * normal.
 */

import { warmReportsCache } from "@/lib/zoho-reports";

/**
 * Cada 30 minutos, por debajo de los 35 que dura la caché de lotes
 * (`LOTS_TTL_MS`): entre dos pasadas nadie encuentra la caché caducada. Las dos
 * cifras van atadas — si se cambia una, hay que mover la otra.
 */
const INTERVAL_MS = 30 * 60 * 1000;

/**
 * El arranque no espera al precalentado, pero tampoco conviene lanzarlo contra
 * Zoho en el mismo instante en que el proceso empieza a servir. Unos segundos
 * de margen, más un salto aleatorio para que dos réplicas que arrancan juntas
 * en un despliegue no golpeen el CRM a la vez.
 */
const FIRST_RUN_DELAY_MS = 5_000;
const JITTER_MS = 25_000;

/** Un solo temporizador por proceso, aunque `register()` corra dos veces. */
let started = false;

/**
 * ¿Toca precalentar en este proceso?
 *
 * En producción sí, salvo que se apague a mano (`REPORTS_WARMUP=off`, útil para
 * un contenedor que no sirve el panel). En desarrollo no, porque cada arranque
 * costaría ~330 llamadas a Zoho; se enciende con `REPORTS_WARMUP=on` cuando se
 * quiere probar.
 */
function isEnabled(): boolean {
  const flag = process.env.REPORTS_WARMUP?.toLowerCase();
  if (flag === "off" || flag === "0" || flag === "false") return false;
  if (flag === "on" || flag === "1" || flag === "true") return true;
  return process.env.NODE_ENV === "production";
}

async function warm(motivo: string): Promise<void> {
  try {
    const result = await warmReportsCache();
    const detalle = result.cargas
      .map(
        (carga) =>
          `${carga.clave}: ${carga.registros} en ${carga.ms} ms` +
          (carga.error ? ` — ERROR: ${carga.error}` : "")
      )
      .join(" | ");

    if (result.ok) {
      console.log(
        `[reports-warmup] (${motivo}) Caché lista en ${result.ms} ms. ${detalle}`
      );
    } else {
      console.error(
        `[reports-warmup] (${motivo}) Caché incompleta tras ${result.ms} ms. ${detalle}`
      );
    }
  } catch (error) {
    // `warmReportsCache` ya captura los fallos de cada carga; esto es la red
    // por si falla algo antes. Un precalentado que revienta no debe tumbar el
    // servidor: el informe seguirá cargando en frío.
    console.error("[reports-warmup] El precalentado falló entero:", error);
  }
}

export function startReportsWarmup(): void {
  if (started) return;
  started = true;

  if (!isEnabled()) {
    console.log(
      "[reports-warmup] Desactivado en este proceso " +
        `(NODE_ENV=${process.env.NODE_ENV}, REPORTS_WARMUP=${process.env.REPORTS_WARMUP ?? "sin definir"}).`
    );
    return;
  }

  const primera = FIRST_RUN_DELAY_MS + Math.floor(Math.random() * JITTER_MS);
  console.log(
    `[reports-warmup] Activo: primera pasada en ${Math.round(primera / 1000)} s, ` +
      `luego cada ${INTERVAL_MS / 60000} min.`
  );

  const arranque = setTimeout(() => void warm("arranque"), primera);
  const periodico = setInterval(() => void warm("periódico"), INTERVAL_MS);

  // Sin `unref`, los temporizadores mantendrían vivo el proceso e impedirían
  // que el contenedor termine limpiamente al recibir la señal de parada.
  arranque.unref?.();
  periodico.unref?.();
}
