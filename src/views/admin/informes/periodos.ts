/**
 * Presets de periodo compartidos por los informes con rango de fechas
 * (altas en Comerciales, noches en Noches vendidas).
 *
 * Se resuelven en el navegador a fechas `AAAA-MM-DD` concretas y viajan como
 * `desde`/`hasta`, de modo que el servidor no tiene que interpretar ninguna
 * etiqueta: recibe siempre un rango explícito y devuelve el que aplicó.
 */
const hoy = () => new Date();

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

/** Primer día del mes `offset` meses atrás (0 = mes en curso). */
const inicioDeMes = (offset: number) => {
  const date = hoy();
  date.setDate(1);
  date.setMonth(date.getMonth() - offset);
  return date;
};

/** Último día del mes `offset` meses atrás. */
const finDeMes = (offset: number) => {
  const date = inicioDeMes(offset);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return date;
};

export const PERIODOS: Record<string, { label: string; desde: string; hasta: string }> = {
  mesActual: {
    label: "Mes en curso",
    desde: iso(inicioDeMes(0)),
    hasta: iso(hoy()),
  },
  mesAnterior: {
    label: "Último mes cerrado",
    desde: iso(inicioDeMes(1)),
    hasta: iso(finDeMes(1)),
  },
  tresMeses: {
    label: "Últimos 3 meses",
    desde: iso(inicioDeMes(2)),
    hasta: iso(hoy()),
  },
  doceMeses: {
    label: "Últimos 12 meses",
    desde: iso(inicioDeMes(11)),
    hasta: iso(hoy()),
  },
  historico: { label: "Todo el histórico", desde: "", hasta: "" },
};

export const PERIODO_POR_DEFECTO = "doceMeses";
