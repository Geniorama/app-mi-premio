/**
 * Serialización a CSV para las descargas del panel.
 *
 * Usa `;` como separador y antepone BOM porque el destino real es Excel en
 * español (es-CO), que con `,` mete todas las columnas en una sola celda.
 */

export interface CsvColumn<T> {
  key: string;
  header: string;
  value: (row: T) => string | number | null | undefined;
}

const SEPARATOR = ";";
const BOM = "﻿";

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  const text = String(value);
  // Un valor que empieza por = + - @ puede ejecutarse como fórmula al
  // abrirse en Excel; se neutraliza con un apóstrofo.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;

  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCell(column.header)).join(SEPARATOR);
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row))).join(SEPARATOR)
  );

  return BOM + [header, ...body].join("\r\n");
}

/** Respuesta de descarga con el nombre de archivo fechado. */
export function csvResponse(csv: string, filename: string): Response {
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Fecha ISO → `DD/MM/AAAA HH:mm` (vacío si no hay dato) */
export function formatDateTimeForCsv(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
