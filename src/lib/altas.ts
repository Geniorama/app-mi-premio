/**
 * Cuándo entró cada afiliado al programa.
 *
 * **Zoho no guarda esa fecha.** Comprobado contra el CRM: `Contacts` no tiene
 * ningún campo de inscripción, `Solicitud_de_Fidelizaci_n` es un sí/no sin
 * fecha, y `Membresias.Created_Time` es la fecha de la migración (115 registros
 * creados de golpe en febrero de 2026), no la de alta de nadie.
 *
 * Lo que sí es un hecho de negocio con fecha es **el primer lote de puntos**:
 * el día en que un afiliado empezó a acumular. Es el criterio que usa el panel
 * para contar altas.
 *
 * Consecuencia que hay que tener presente al leer el informe: un afiliado
 * registrado en el CRM que todavía no ha recibido puntos **no cuenta como
 * alta**, porque no hay ninguna fecha que decir. Aparece en el padrón (en
 * Afiliados, como "sin membresía") pero no en la serie de altas.
 */

import type { PointsLotRow } from "@/lib/zoho-reports";

/**
 * Fecha del primer lote de cada red de membresía: `rootId → fecha ISO`.
 *
 * Se toma el mínimo, no el lote más antiguo por orden de llegada: los lotes no
 * vienen ordenados y una red puede haber recibido cargas retroactivas.
 */
export function altaByNetwork(lots: PointsLotRow[]): Map<string, string> {
  const altas = new Map<string, string>();

  for (const lot of lots) {
    if (!lot.fechaEntrega) continue;
    const actual = altas.get(lot.rootId);
    if (!actual || lot.fechaEntrega < actual) {
      altas.set(lot.rootId, lot.fechaEntrega);
    }
  }

  return altas;
}

/**
 * ¿Cae la fecha dentro del rango? Los límites se comparan como texto ISO
 * (`AAAA-MM-DD`), que es como llegan de Zoho: evita construir `Date` y con
 * ello cualquier corrimiento de zona horaria en los bordes del rango.
 *
 * `hasta` es **inclusivo**: se compara contra el día completo, de modo que un
 * lote entregado a las 15:00 del día final entra.
 */
export function inRange(
  iso: string | null,
  desde: string | null,
  hasta: string | null
): boolean {
  if (!iso) return false;
  const dia = iso.slice(0, 10);
  if (desde && dia < desde) return false;
  if (hasta && dia > hasta) return false;
  return true;
}
