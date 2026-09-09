/**
 * El hotel de un lote de puntos vive en el lookup `Entrega_OC` del
 * subformulario `Puntos_Membresia`, dentro de su nombre:
 *
 *   "ME211_Mercure bh Zona Financiera_CRM - 000 - 699191"
 *    └ membresía  └ hotel                └ referencia del CRM
 *
 * No hay un campo propio con el hotel, así que se extrae del string. Es el
 * mismo criterio que ve el afiliado en sus extractos: si el panel y el
 * extracto parsearan distinto, los totales por hotel no cuadrarían.
 */

/** Etiqueta para los lotes sin hotel identificable. */
export const SIN_HOTEL = "Sin hotel";

/**
 * Hotel = segmento entre el primer `_` y `_CRM`. Si el string no tiene esa
 * forma se devuelve completo: es un fallback visible, mejor que esconder el
 * dato cuando el CRM cambie el formato.
 */
export function extractHotelName(entregaOC: string | null | undefined): string | null {
  if (!entregaOC) return null;
  const match = entregaOC.match(/^[^_]+_(.+?)_CRM/);
  return match ? match[1].trim() : entregaOC.trim();
}

/** Como `extractHotelName`, pero siempre devuelve algo agrupable. */
export function hotelLabel(entregaOC: string | null | undefined): string {
  return extractHotelName(entregaOC) || SIN_HOTEL;
}
