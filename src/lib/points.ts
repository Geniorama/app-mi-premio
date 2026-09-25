/**
 * Equivalencia del programa entre puntos y pesos.
 *
 * Fuente única de verdad: si la tasa cambia, se cambia aquí y el panel entero
 * (tablas, tarjetas y CSV) queda al día.
 */

/** 1 punto = 10 COP */
export const COP_PER_POINT = 10;

/** Puntos → pesos colombianos. */
export function pointsToCop(points: number | null | undefined): number {
  if (points === null || points === undefined || Number.isNaN(points)) return 0;
  return points * COP_PER_POINT;
}

/**
 * Equivalencia comercial entre puntos y noches de hotel: cada noche vendida
 * genera 400 puntos al afiliado. Es la que usa el panel para traducir los
 * puntos entregados de un lote en noches vendidas.
 */
export const POINTS_PER_NIGHT = 400;

/**
 * Puntos → noches. No se redondea: un lote que no sea múltiplo de 400 (un
 * ajuste, una carga parcial) aporta una fracción, y redondear lote a lote
 * haría que la suma por hotel no cuadrara con sus puntos.
 */
export function pointsToNights(points: number | null | undefined): number {
  if (points === null || points === undefined || Number.isNaN(points)) return 0;
  return points / POINTS_PER_NIGHT;
}
