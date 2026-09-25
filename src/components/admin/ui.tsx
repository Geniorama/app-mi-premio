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
import { pointsToCop } from "@/lib/points";

// -------------------------------------------------------------- formateadores

const numberFormatter = new Intl.NumberFormat("es-CO");

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter.format(Math.round(value));
}

const nightsFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

/**
 * Noches vendidas: enteras cuando lo son y con un decimal cuando algún lote
 * no es múltiplo de 400 puntos (12,5 noches), para no esconder la fracción.
 */
export function formatNights(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return nightsFormatter.format(value);
}

/** Pesos colombianos: 50000 → "$ 50.000" */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$ ${numberFormatter.format(Math.round(value))}`;
}

/** Puntos → su equivalente en pesos, ya formateado. */
export function formatPointsAsCop(points: number | null | undefined): string {
  return formatCurrency(pointsToCop(points));
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

/**
 * Celda de una cifra de puntos, con los pesos al frente.
 *
 * Quien decide sobre el programa lee en dinero: el peso es la cifra grande y
 * los puntos quedan debajo como la unidad operativa. Antes era al revés y el
 * valor en pesos se perdía como texto de pie de nota.
 */
export function MoneyCell({
  points,
  tone = "default",
}: {
  points: number | null | undefined;
  tone?: "default" | "accent" | "critical";
}) {
  const color =
    tone === "accent"
      ? "text-custom-green"
      : tone === "critical"
        ? "text-[#d03b3b]"
        : "text-[#0b0b0b]";

  return (
    <div>
      <p className={`font-semibold [font-variant-numeric:tabular-nums] ${color}`}>
        {formatPointsAsCop(points)}
      </p>
      <p className="text-xs font-normal text-[#52514e]">
        {formatNumber(points)} pts
      </p>
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: number | string;
  hint?: string;
  /**
   * El valor son puntos: la tarjeta encabeza con su equivalente en pesos y
   * deja los puntos como segunda línea.
   */
  money?: boolean;
  tone?: "default" | "accent" | "critical";
}

export function StatTile({
  label,
  value,
  hint,
  money = false,
  tone = "default",
}: StatTileProps) {
  const showMoney = money && typeof value === "number";
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
        {showMoney
          ? formatPointsAsCop(value as number)
          : typeof value === "number"
            ? formatNumber(value)
            : value}
      </p>
      {showMoney && (
        <p className="mt-1 text-sm font-medium [font-variant-numeric:tabular-nums] text-[#52514e]">
          {formatNumber(value as number)} puntos
        </p>
      )}
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

/**
 * Estilo de un control con un valor distinto del de por defecto. Va por
 * selector descendiente para no tener que tocar el `className` de cada input.
 */
const ACTIVE_CONTROL =
  "[&_input]:border-custom-green [&_input]:bg-custom-green/5 [&_select]:border-custom-green [&_select]:bg-custom-green/5 [&_input]:font-medium [&_select]:font-medium";

export function Field({
  label,
  wide = false,
  active = false,
  children,
}: {
  label: string;
  /** Ocupa dos columnas de la rejilla: búsquedas y listas con nombres largos */
  wide?: boolean;
  /** El filtro está aplicado: se resalta para que no pase desapercibido */
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex min-w-0 flex-col gap-1 text-xs font-medium ${
        active ? `text-custom-green ${ACTIVE_CONTROL}` : "text-[#52514e]"
      } ${wide ? "sm:col-span-2" : ""}`}
    >
      <span className="flex items-center gap-1.5">
        {active && (
          <span aria-hidden="true" className="size-1.5 rounded-full bg-custom-green" />
        )}
        {label}
        {active && <span className="sr-only">(filtro aplicado)</span>}
      </span>
      {children}
    </label>
  );
}

/** Casilla de filtro, con el mismo resaltado que `Field` cuando está marcada. */
export function CheckField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors ${
        checked
          ? "border-custom-green bg-custom-green/5 font-medium text-custom-green"
          : "border-transparent text-[#52514e]"
      }`}
    >
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[#417D30]"
      />
      {label}
    </label>
  );
}

/**
 * Cuántos filtros hay aplicados y el atajo para quitarlos todos.
 *
 * `panel` va en la cabecera del panel de filtros; `banner`, encima de los
 * resultados, que es donde se leen las cifras y donde más confunde no saber
 * que están recortadas. Sin filtros no pinta nada.
 */
export function ActiveFilters({
  count,
  onClear,
  variant = "panel",
}: {
  count: number;
  onClear: () => void;
  variant?: "panel" | "banner";
}) {
  if (count === 0) return null;

  const texto = count === 1 ? "1 filtro aplicado" : `${count} filtros aplicados`;
  const limpiar = (
    <button
      type="button"
      onClick={onClear}
      className="cursor-pointer text-sm font-medium text-custom-green underline underline-offset-2 hover:no-underline"
    >
      Limpiar filtros
    </button>
  );

  if (variant === "banner") {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-custom-green/30 bg-custom-green/5 px-4 py-2.5 text-sm text-[#0b0b0b]"
      >
        <p>
          <span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full bg-custom-green" />
          Estás viendo resultados filtrados: <strong>{texto}</strong>. Las cifras no son
          del total del programa.
        </p>
        {limpiar}
      </div>
    );
  }

  return (
    <>
      <span className="inline-flex h-7 items-center rounded-full bg-custom-green px-2.5 text-xs font-semibold text-white">
        {texto}
      </span>
      {limpiar}
    </>
  );
}

/**
 * Rejilla de filtros.
 *
 * Cada control ocupa una columna de al menos 13rem y las columnas se reparten
 * el ancho sobrante, así que los desplegables crecen con la pantalla en vez de
 * quedarse del ancho de su texto y cortar los nombres largos. En móvil, una
 * columna.
 */
export const filterGridClass =
  "grid grid-cols-1 items-end gap-3 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]";

export function FilterGrid({ children }: { children: ReactNode }) {
  return <div className={filterGridClass}>{children}</div>;
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

// ---------------------------------------------------------------- paginación

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
}

/**
 * Construye la lista de páginas a mostrar, colapsando los tramos largos con
 * elipsis: siempre la primera, la última, y una ventana alrededor de la actual.
 */
function pageItems(page: number, totalPages: number): Array<number | "gap"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = new Set<number>([1, totalPages, page]);
  if (page - 1 > 1) items.add(page - 1);
  if (page + 1 < totalPages) items.add(page + 1);
  if (page <= 3) [2, 3, 4].forEach((n) => items.add(n));
  if (page >= totalPages - 2) {
    [totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => items.add(n));
  }

  const sorted = [...items].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  const result: Array<number | "gap"> = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push("gap");
    result.push(value);
    previous = value;
  }
  return result;
}

const PAGE_SIZES = [25, 50, 100, 200];

export function Pagination({
  meta,
  onPageChange,
  onPageSizeChange,
  itemLabel = "registros",
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemLabel?: string;
}) {
  const { page, pageSize, total, totalPages, from, to } = meta;

  // Con una sola página basta el conteo; los controles no aportan nada.
  const showControls = totalPages > 1;

  return (
    <nav
      aria-label="Paginación"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3"
    >
      <p className="text-xs text-[#52514e]" aria-live="polite">
        {total === 0
          ? `Sin ${itemLabel}`
          : `${formatNumber(from)}–${formatNumber(to)} de ${formatNumber(total)} ${itemLabel}`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-[#52514e]">
          Por página
          <select
            className="h-8 rounded-lg border border-black/15 bg-white px-1.5 text-sm text-[#0b0b0b] outline-none focus:border-custom-green"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        {showControls && (
          <div className="flex items-center gap-1">
            <PageButton
              label="Anterior"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              ‹
            </PageButton>

            {pageItems(page, totalPages).map((item, index) =>
              item === "gap" ? (
                <span
                  key={`gap-${index}`}
                  aria-hidden="true"
                  className="px-1 text-xs text-[#898781]"
                >
                  …
                </span>
              ) : (
                <PageButton
                  key={item}
                  label={`Página ${item}`}
                  active={item === page}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </PageButton>
              )
            )}

            <PageButton
              label="Siguiente"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              ›
            </PageButton>
          </div>
        )}
      </div>
    </nav>
  );
}

function PageButton({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`h-8 min-w-8 cursor-pointer rounded-lg border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-custom-green bg-custom-green font-semibold text-white"
          : "border-black/15 bg-white text-[#0b0b0b] hover:border-custom-green hover:text-custom-green"
      }`}
    >
      {children}
    </button>
  );
}

/** Bloque gris pulsante que ocupa el sitio de un dato mientras llega. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`animate-pulse rounded-lg bg-black/[0.07] ${className}`} />
  );
}

/**
 * Esqueleto de un informe en su primera carga: filtros, tarjetas y tabla.
 *
 * Sustituye a los controles reales a propósito: con los desplegables aún
 * vacíos el usuario elegiría sobre opciones incompletas, y cada cambio lanzaría
 * otra lectura antes de que termine la primera.
 */
export function ReportSkeleton({
  filters = 4,
  tiles = 4,
  rows = 6,
  label = "Cargando informe…",
}: {
  /** Controles del panel de filtros; 0 para informes sin filtros */
  filters?: number;
  tiles?: number;
  rows?: number;
  /** Aviso visible, para lecturas que se sabe que tardan */
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label={label}>
      <p className="text-xs text-[#898781]">{label}</p>

      {filters > 0 && (
        <section className="rounded-xl border border-black/10 bg-white">
          <header className="border-b border-black/10 px-5 py-4">
            <Skeleton className="h-5 w-24" />
          </header>
          <div className={`${filterGridClass} p-5`}>
            {Array.from({ length: filters }, (_, index) => (
              <div key={index} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: tiles }, (_, index) => (
          <div key={index} className="rounded-xl border border-black/10 bg-white p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-black/10 bg-white">
        <header className="border-b border-black/10 px-5 py-4">
          <Skeleton className="h-5 w-40" />
        </header>
        <div className="flex flex-col gap-3 p-5">
          {Array.from({ length: rows }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Resultados de un informe que se está recargando.
 *
 * Se conservan los datos anteriores —vaciar la pantalla en cada filtro haría
 * saltar el scroll— pero atenuados y sin interacción hasta que llega la
 * respuesta nueva, para que nadie lea cifras viejas como si fueran las nuevas.
 */
export function BusyArea({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <div
      aria-busy={busy}
      className={`flex flex-col gap-6 transition-opacity ${
        busy ? "pointer-events-none opacity-50" : ""
      }`}
    >
      {children}
    </div>
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
