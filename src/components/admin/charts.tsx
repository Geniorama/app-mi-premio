"use client";

/**
 * Gráficos del panel. Todos son de **una sola serie**, así que la identidad
 * nunca depende de distinguir colores entre sí: el color codifica magnitud
 * (una sola familia de verde) y cada marca lleva su etiqueta de texto.
 *
 * La rampa ordinal está validada contra la superficie blanca de las tarjetas
 * (monotonía de luminosidad, salto mínimo entre pasos y extremo claro por
 * encima de 2:1 de contraste).
 */

import { useState } from "react";
import { formatNumber } from "./ui";

/** Verde de marca (#417D30) y su rampa ordinal validada */
const BRAND_GREEN = "#417D30";
const ORDINAL_GREEN = ["#8CBF7D", "#6EAD5D", "#54993F", "#417D30", "#2A5220"];
const CRITICAL = "#d03b3b";

const GRID = "#e1e0d9";
const BASELINE = "#c3c2b7";
const MUTED = "#898781";

// ------------------------------------------------------- columnas por período

export interface ColumnPoint {
  label: string;
  /** Etiqueta larga para el tooltip */
  fullLabel: string;
  /** Magnitud de la barra. Siempre en la misma unidad para todo el gráfico. */
  value: number;
  /**
   * Texto que sustituye a `value` al escribirlo (p. ej. su valor en pesos).
   * La barra sigue midiendo `value`; solo cambia lo que se lee.
   */
  display?: string;
  /** Línea extra bajo el valor en el tooltip */
  valueHint?: string;
  secondary?: number;
  secondaryLabel?: string;
}

export function ColumnChart({
  points,
  valueLabel,
  emptyMessage = "Sin movimientos en el período.",
}: {
  points: ColumnPoint[];
  valueLabel: string;
  emptyMessage?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(...points.map((point) => point.value), 0);

  if (!points.length || max === 0) {
    return <p className="py-12 text-center text-sm text-[#52514e]">{emptyMessage}</p>;
  }

  // El máximo lleva etiqueta directa; el resto se lee por hover (etiquetado
  // selectivo, no un número sobre cada barra).
  const maxIndex = points.findIndex((point) => point.value === max);

  return (
    <div>
      <div className="relative h-56">
        {/* Rejilla recesiva */}
        <div aria-hidden="true" className="absolute inset-0">
          {[0, 25, 50, 75, 100].map((offset) => (
            <div
              key={offset}
              className="absolute left-0 right-0 border-t"
              style={{
                top: `${offset}%`,
                borderColor: offset === 100 ? BASELINE : GRID,
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 flex items-end gap-[2px]">
          {points.map((point, index) => {
            const height = max > 0 ? (point.value / max) * 100 : 0;
            const active = hovered === index;

            return (
              <div
                key={point.label}
                className="relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="img"
                aria-label={`${point.fullLabel}: ${formatNumber(point.value)} ${valueLabel}`}
              >
                <div
                  className="w-full rounded-t-[4px] transition-opacity"
                  style={{
                    height: `${Math.max(height, point.value > 0 ? 1.5 : 0)}%`,
                    backgroundColor: BRAND_GREEN,
                    opacity: hovered === null || active ? 1 : 0.45,
                  }}
                />

                {index === maxIndex && point.value > 0 && (
                  <span
                    className="pointer-events-none absolute inset-x-0 text-center text-[11px] font-semibold text-[#0b0b0b]"
                    style={{ bottom: `calc(${height}% + 4px)` }}
                  >
                    {point.display ?? formatNumber(point.value)}
                  </span>
                )}

                {active && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-[#0b0b0b]">{point.fullLabel}</p>
                    <p className="text-[#52514e]">
                      {point.display ?? `${formatNumber(point.value)} ${valueLabel}`}
                    </p>
                    {point.valueHint && (
                      <p className="text-[#52514e]">{point.valueHint}</p>
                    )}
                    {point.secondary !== undefined && (
                      <p className="text-[#52514e]">
                        {formatNumber(point.secondary)} {point.secondaryLabel}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-[2px]">
        {points.map((point) => (
          <span
            key={point.label}
            className="flex-1 truncate text-center text-[10px]"
            style={{ color: MUTED }}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ barras ordinales

export interface OrdinalBar {
  label: string;
  /** Magnitud de la barra. Siempre en la misma unidad para todo el gráfico. */
  value: number;
  /** Texto que sustituye a `value` al escribirlo (p. ej. su valor en pesos) */
  display?: string;
  hint?: string;
  /** Marca la barra con el color de estado crítico (p. ej. ya vencidos) */
  critical?: boolean;
}

export function OrdinalBarList({
  bars,
  valueLabel,
}: {
  bars: OrdinalBar[];
  valueLabel: string;
}) {
  const max = Math.max(...bars.map((bar) => bar.value), 0);

  if (!bars.length || max === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#52514e]">
        No hay puntos en estas ventanas.
      </p>
    );
  }

  // La rampa se recorre del más urgente al menos urgente
  let ordinalIndex = 0;

  return (
    <ul className="flex flex-col gap-3">
      {bars.map((bar) => {
        const color = bar.critical
          ? CRITICAL
          : ORDINAL_GREEN[
              Math.min(
                ORDINAL_GREEN.length - 1,
                ORDINAL_GREEN.length - 1 - ordinalIndex++
              )
            ];

        return (
          <li key={bar.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-[#0b0b0b]">{bar.label}</span>
              <span className="[font-variant-numeric:tabular-nums] font-semibold text-[#0b0b0b]">
                {bar.display ?? formatNumber(bar.value)}{" "}
                {!bar.display && (
                  <span className="text-xs font-normal text-[#52514e]">
                    {valueLabel}
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[#f0efec]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max((bar.value / max) * 100, 1)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            {bar.hint && (
              <p className="mt-1 text-xs text-[#52514e]">{bar.hint}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------- minigráfico

/**
 * Barras diminutas para leer una tendencia dentro de una celda de tabla.
 *
 * No lleva ejes ni cifras: la columna de al lado ya da el número exacto y el
 * minigráfico solo aporta la forma. Por eso es `aria-hidden` y va acompañado
 * de un `title` con el periodo, para que quien use lector de pantalla no
 * pierda nada: la información está en el texto de la fila.
 *
 * La escala es **propia de cada fila** (su propio máximo). Comparar la altura
 * entre dos comerciales distintos no significa nada; comparar la forma de uno
 * consigo mismo, sí.
 */
export function Sparkline({
  values,
  title,
}: {
  values: number[];
  title?: string;
}) {
  const max = Math.max(...values, 0);

  if (!values.length || max === 0) {
    return <span className="text-xs text-[#898781]">—</span>;
  }

  return (
    <span
      className="inline-flex h-6 items-end gap-px align-middle"
      title={title}
      aria-hidden="true"
    >
      {values.map((value, index) => (
        <span
          key={index}
          className="w-1 rounded-sm"
          style={{
            // Un mínimo visible para que un mes con altas no se confunda con
            // un mes en blanco; el cero se queda como una marca tenue.
            height: value === 0 ? 2 : Math.max(3, (value / max) * 24),
            backgroundColor: value === 0 ? GRID : BRAND_GREEN,
          }}
        />
      ))}
    </span>
  );
}
