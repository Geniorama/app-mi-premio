/**
 * Paginación de los informes del panel.
 *
 * Se aplica en el servidor: el informe de puntos por vencer produce miles de
 * lotes y enviarlos todos al navegador para recortarlos allí desperdiciaría
 * la transferencia y montaría un DOM enorme.
 *
 * Dos reglas que el llamador debe respetar:
 * 1. Los totales y resúmenes se calculan sobre el conjunto **completo** ya
 *    filtrado, antes de paginar.
 * 2. La exportación a CSV **no** se pagina: descarga todo lo filtrado.
 */

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const MAX_PAGE_SIZE = 200;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Índice 1-based del primer registro de la página (0 si no hay ninguno) */
  from: number;
  /** Índice 1-based del último registro de la página */
  to: number;
}

export interface PaginationInput {
  page: number;
  pageSize: number;
}

/** Lee `page` y `pageSize` de la query, con valores por defecto seguros. */
export function parsePagination(params: URLSearchParams): PaginationInput {
  const rawPage = Number(params.get("page"));
  const rawPageSize = Number(params.get("pageSize"));

  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(Math.floor(rawPageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

/**
 * Recorta la página pedida. Si `page` se pasa del final (p. ej. el usuario
 * estaba en la página 9 y aplicó un filtro que deja 2), devuelve la última
 * página existente en vez de una lista vacía.
 */
export function paginate<T>(
  rows: T[],
  { page, pageSize }: PaginationInput
): { rows: T[]; pagination: PaginationMeta } {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return {
    rows: pageRows,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
      from: total === 0 ? 0 : start + 1,
      to: start + pageRows.length,
    },
  };
}
