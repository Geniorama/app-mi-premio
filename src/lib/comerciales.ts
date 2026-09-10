/**
 * El comercial que atiende a un afiliado es el **propietario del contacto** en
 * Zoho (`Owner`), no un campo propio del programa. Es la asignación que ya
 * mantiene el equipo comercial en el CRM: cambiarla allí cambia el informe.
 *
 * Este módulo existe para que la etiqueta del grupo residual sea la misma en
 * la agregación y en la vista, igual que `SIN_HOTEL` en `hotels.ts`. Si la
 * ruta y el filtro escribieran cada uno su literal, el filtro dejaría de
 * casar con la fila el día que uno de los dos cambiara.
 */

/**
 * Filas sin propietario en el CRM.
 *
 * Hoy no hay ninguna —los 405 contactos afiliados tienen `Owner`—, pero sí
 * caen aquí las redes de membresía cuyo contacto quedó fuera del padrón
 * activo: tienen puntos y no se pueden esconder, así que necesitan un grupo.
 */
export const SIN_COMERCIAL = "Sin comercial asignado";
