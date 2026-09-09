/**
 * Reagrupa las redenciones de Zoho por la red de membresías (Padre) a la que
 * pertenecen, para que un bono no aparezca partido en el panel.
 *
 * Al redimir, la web reparte los puntos FIFO entre los registros de la red y
 * crea **una redención en Zoho por cada membresía** que aporta puntos (ver
 * `/api/redemptions`). Sin reagrupar, un bono de 50.000 pagado con cinco
 * ciclos sale en el informe como cinco redenciones sueltas.
 */

export interface RedemptionReportRow {
  /** Clave de la fila: los ids de Zoho que la componen, unidos */
  id: string;
  /** Ids de los registros de Zoho agrupados en esta fila */
  ids: string[];
  nombre: string;
  nombres: string[];
  /** Cuántos registros de Zoho representa la fila (1 = sin fragmentar) */
  tramos: number;
  afiliado: string;
  email: string;
  /** Membresía Padre (red del afiliado) a la que pertenece la redención */
  rootId: string;
  membresiaId: string;
  membresiaIds: string[];
  membresia: string;
  membresias: string[];
  puntos: number;
  estado: string;
  estadoRaw: string;
  /** true si los tramos no comparten el mismo estado en Zoho */
  estadoMixto: boolean;
  fecha: string | null;
  /** Datos que solo existen en la auditoría de Sanity */
  bono: string;
  bonoSlug: string;
  /** Valor en puntos del bono: cierra el grupo cuando los tramos lo completan */
  bonoPuntos: number;
  categoria: string;
  estadoEntrega: string;
  correoEntrega: string;
  procesadaEn: string | null;
  /** true si la redención se originó en la web (existe en Sanity) */
  origenWeb: boolean;
}

/**
 * Los tramos de un bono se crean en serie contra Zoho, uno detrás de otro: en
 * los datos reales los cinco tramos de una redención de 50.000 caben en tres
 * segundos. Dos minutos deja margen de sobra para una racha lenta sin acercarse
 * a la distancia que separa dos redenciones hechas a mano seguidas.
 */
const GROUP_WINDOW_MS = 2 * 60 * 1000;

/** De menos a más avanzado. El grupo hereda el estado del tramo más atrasado. */
const STATUS_PROGRESS = [
  "rechazada",
  "cancelada",
  "pendiente",
  "procesada",
  "entregada",
];

const statusRank = (status: string): number => {
  const index = STATUS_PROGRESS.indexOf(status);
  return index === -1 ? STATUS_PROGRESS.length : index;
};

/** Nunca reportar como entregado un bono que solo lo está a medias. */
const leastAdvanced = (statuses: string[]): string =>
  statuses.filter(Boolean).sort((a, b) => statusRank(a) - statusRank(b))[0] ?? "";

const timeOf = (date: string | null): number => {
  const value = date ? new Date(date).getTime() : NaN;
  return Number.isNaN(value) ? 0 : value;
};

/**
 * ¿Este tramo continúa el bono que se está armando?
 *
 * Tres condiciones, y las tres vienen de cómo se crea la fragmentación:
 *
 * 1. **Mismo afiliado y mismo bono.** Sin bono (redenciones creadas a mano en
 *    el CRM) no hay forma de saber si dos registros son la misma solicitud, así
 *    que esas nunca se agrupan.
 * 2. **Membresía distinta.** El reparto FIFO recorre los registros de la red
 *    una sola vez: dos tramos del mismo bono jamás salen de la misma membresía.
 *    Dos redenciones seguidas del mismo bono sí suelen repetirla.
 * 3. **El bono todavía no está pagado.** Los tramos de una redención suman
 *    exactamente el valor del bono; en cuanto el grupo llega a esa cifra, el
 *    siguiente registro ya es otra redención. Es la señal más fiable: distingue
 *    tres canjes seguidos de 3.000 de un solo canje de 9.000.
 */
function continuesGroup(group: RedemptionReportRow[], row: RedemptionReportRow): boolean {
  const previous = group[group.length - 1];

  if (row.bonoSlug === "" || previous.bonoSlug !== row.bonoSlug) return false;
  if (previous.rootId !== row.rootId) return false;
  if (Math.abs(timeOf(row.fecha) - timeOf(previous.fecha)) > GROUP_WINDOW_MS) return false;
  if (group.some((tramo) => tramo.membresiaId === row.membresiaId)) return false;

  // Con el valor del bono conocido, el grupo se cierra al completarlo.
  if (row.bonoPuntos > 0) {
    const acumulado = group.reduce((total, tramo) => total + tramo.puntos, 0);
    if (acumulado >= row.bonoPuntos) return false;
  }

  return true;
}

/** Une los tramos de un mismo bono en una sola fila. */
export function groupRedemptions(rows: RedemptionReportRow[]): RedemptionReportRow[] {
  const sorted = [...rows].sort(
    (a, b) =>
      a.rootId.localeCompare(b.rootId) ||
      a.bonoSlug.localeCompare(b.bonoSlug) ||
      (a.fecha ?? "").localeCompare(b.fecha ?? "")
  );

  const groups: RedemptionReportRow[][] = [];

  for (const row of sorted) {
    const current = groups[groups.length - 1];
    if (current && continuesGroup(current, row)) current.push(row);
    else groups.push([row]);
  }

  return groups.map((tramos) => {
    if (tramos.length === 1) return tramos[0];

    // Los tramos vienen ordenados por fecha: el primero es el de referencia.
    const [first] = tramos;
    const estado = leastAdvanced(tramos.map((t) => t.estado));
    const procesadas = tramos
      .map((t) => t.procesadaEn)
      .filter((fecha): fecha is string => Boolean(fecha));

    return {
      ...first,
      id: tramos.map((t) => t.id).join("|"),
      ids: tramos.map((t) => t.id),
      nombres: tramos.map((t) => t.nombre),
      tramos: tramos.length,
      membresiaIds: tramos.map((t) => t.membresiaId),
      membresias: tramos.map((t) => t.membresia),
      membresia: tramos.map((t) => t.membresia).join(" + "),
      puntos: tramos.reduce((total, t) => total + t.puntos, 0),
      estado,
      estadoRaw: tramos.find((t) => t.estado === estado)?.estadoRaw ?? first.estadoRaw,
      estadoMixto: new Set(tramos.map((t) => t.estado)).size > 1,
      estadoEntrega: leastAdvanced(tramos.map((t) => t.estadoEntrega)),
      correoEntrega: tramos.find((t) => t.correoEntrega)?.correoEntrega ?? "",
      // El bono solo está procesado cuando lo están todos sus tramos
      procesadaEn:
        procesadas.length === tramos.length
          ? procesadas.sort().reverse()[0]
          : null,
      origenWeb: tramos.some((t) => t.origenWeb),
    };
  });
}
