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
