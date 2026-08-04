"use client";

/**
 * Piezas compartidas del panel administrativo.
 *
 * Notas de diseño de datos:
 * - Las cifras de cabecera son *stat tiles*, no un gráfico de una barra.
 * - Los estados de redención usan la paleta de estado y **siempre** van con
 *   su etiqueta de texto: el color es refuerzo, nunca el único portador del
 *   significado.
 * - Las columnas numéricas usan `tabular-nums` para que alineen verticalmente.
 */

import type { ReactNode } from "react";

// -------------------------------------------------------------- formateadores

const numberFormatter = new Intl.NumberFormat("es-CO");

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter.format(Math.round(value));
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ------------------------------------------------------------------ stat tile

interface StatTileProps {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "accent" | "critical";
}

export function StatTile({ label, value, hint, tone = "default" }: StatTileProps) {
  const valueColor =
    tone === "accent"
      ? "text-custom-green"
      : tone === "critical"
        ? "text-[#d03b3b]"
        : "text-[#0b0b0b]";

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#898781]">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${valueColor}`}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {hint && <p className="mt-1 text-xs text-[#52514e]">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- panel/card

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-black/10 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#0b0b0b]">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-[#52514e]">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ------------------------------------------------------------- estado (pill)

/** Paleta de estado reservada. Nunca se reutiliza para "serie N". */
const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  entregada: { dot: "#0ca30c", label: "Entregada" },
  procesada: { dot: "#ec835a", label: "Procesada" },
  pendiente: { dot: "#fab219", label: "Pendiente" },
  rechazada: { dot: "#d03b3b", label: "Rechazada" },
  cancelada: { dot: "#898781", label: "Cancelada" },
  sin_estado: { dot: "#c3c2b7", label: "Sin estado" },
};

export function statusLabel(status: string): string {
  return (
    STATUS_STYLES[status]?.label ??
    status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { dot: "#898781", label: status };

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-[#0b0b0b]">
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: style.dot }}
      />
      {statusLabel(status)}
    </span>
  );
}

// --------------------------------------------------------------------- tabla

export interface Column<T> {
  key: string;
  header: string;
  /** Alinea a la derecha y aplica cifras tabulares */
  numeric?: boolean;
  render: (row: T) => ReactNode;
  /** Clave por la que ordena esta columna (si es ordenable) */
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  sort?: string;
  direction?: "asc" | "desc";
  onSort?: (key: string) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No hay datos para los filtros seleccionados.",
  sort,
  direction,
  onSort,
}: DataTableProps<T>) {
  if (!rows.length) {
    return (
      <p className="py-10 text-center text-sm text-[#52514e]">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left">
            {columns.map((column) => {
              const sortable = Boolean(column.sortKey && onSort);
              const active = column.sortKey && sort === column.sortKey;

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    active
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#52514e] ${
                    column.numeric ? "text-right" : "text-left"
                  }`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(column.sortKey as string)}
                      className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-custom-green"
                    >
                      {column.header}
                      <span aria-hidden="true" className="text-[10px]">
                        {active ? (direction === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-black/5 last:border-0 hover:bg-[#f6f6f6]"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-2.5 align-middle ${
                    column.numeric
                      ? "text-right [font-variant-numeric:tabular-nums]"
                      : "text-left"
                  }`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ controles

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-[#52514e]">
      {label}
      {children}
    </label>
  );
}

export const inputClass =
  "h-9 rounded-lg border border-black/15 bg-white px-2.5 text-sm text-[#0b0b0b] outline-none focus:border-custom-green";

export function ExportButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-custom-green px-3 text-sm font-medium text-custom-green transition-colors hover:bg-custom-green hover:text-white"
    >
      Descargar CSV
    </a>
  );
}

export function Spinner({ label = "Cargando informe…" }: { label?: string }) {
  return (
    <p className="py-12 text-center text-sm text-[#52514e]" role="status">
      {label}
    </p>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-[#d03b3b]/30 bg-[#d03b3b]/5 px-4 py-3 text-sm text-[#d03b3b]"
    >
      {message}
    </p>
  );
}
