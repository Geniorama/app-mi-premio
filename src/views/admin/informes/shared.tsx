"use client";

/**
 * Tipos, hooks y utilidades compartidos por las secciones de Informes.
 *
 * Cada sección es ahora una ruta propia (`/admin/informes/<slug>`), así que
 * el token de recarga —que antes bajaba por props desde el contenedor de
 * pestañas— viaja por contexto desde el encabezado del módulo.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PaginationMeta } from "@/components/admin/ui";

/** Se incrementa al pulsar "Actualizar datos"; fuerza `?refresh=1`. */
const RefreshContext = createContext(0);

export const RefreshProvider = RefreshContext.Provider;

export function useRefreshToken(): number {
  return useContext(RefreshContext);
}

export interface Totals {
  afiliados: number;
  afiliadosConSaldo: number;
  membresias: number;
  puntosEntregados: number;
  saldoDisponible: number;
  puntosRedimidos: number;
  puntosVencidos: number;
  puntosPorVencer: number;
  redenciones: number;
  redencionesPorEstado: Record<string, number>;
  puntosPorEstado: Record<string, number>;
}

export interface OverviewData {
  totals: Totals;
  serieMensual: Array<{ mes: string; redenciones: number; puntos: number }>;
  topAfiliados: Array<{
    nombre: string;
    email: string;
    puntosRedimidos: number;
    redenciones: number;
  }>;
  topBonos: Array<{ bono: string; canjes: number; puntos: number }>;
  cobertura: { redencionesZoho: number; redencionesAuditadas: number };
  generadoEn: string;
}

export interface RedemptionRow {
  id: string;
  nombre: string;
  afiliado: string;
  email: string;
  membresia: string;
  puntos: number;
  estado: string;
  estadoRaw: string;
  fecha: string | null;
  bono: string;
  bonoSlug: string;
  categoria: string;
  estadoEntrega: string;
  correoEntrega: string;
  procesadaEn: string | null;
  origenWeb: boolean;
}

export interface RedemptionsData {
  rows: RedemptionRow[];
  pagination: PaginationMeta;
  resumen: {
    redenciones: number;
    puntos: number;
    porEstado: Record<string, number>;
    desdeWeb: number;
  };
}

export interface AffiliateRow {
  rootId: string;
  email: string;
  nombre: string;
  empresa: string;
  membresiaNo: string;
  tipoAfiliado: string;
  estadoFidelizacion: string;
  puntosEntregados: number;
  saldoDisponible: number;
  puntosRedimidos: number;
  puntosVencidos: number;
  puntosPorVencer: number;
  ciclos: number;
  redenciones: number;
  ultimaRedencion: string | null;
  ultimaActividad: string | null;
}

export interface AffiliatesData {
  rows: AffiliateRow[];
  pagination: PaginationMeta;
  resumen: {
    afiliados: number;
    puntosEntregados: number;
    puntosRedimidos: number;
    saldoDisponible: number;
  };
  tipos: string[];
}

export interface ExpiringRow {
  rootId: string;
  membershipId: string;
  membershipName: string;
  email: string;
  nombre: string;
  puntosEntregados: number;
  puntosRedimidos: number;
  saldoLote: number;
  fechaEntrega: string | null;
  fechaVencimiento: string | null;
  estado: string;
  diasParaVencer: number | null;
}

export interface ExpiringData {
  rows: ExpiringRow[];
  pagination: PaginationMeta;
  ventanas: Array<{
    clave: string;
    etiqueta: string;
    lotes: number;
    puntos: number;
    afiliados: number;
  }>;
  resumen: { lotes: number; puntos: number; afiliados: number; dias: number };
}

const MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function monthLabels(month: string) {
  const [year, monthIndex] = month.split("-");
  const short = MONTH_LABELS[Number(monthIndex) - 1] ?? month;
  return {
    short,
    full: `${short.charAt(0).toUpperCase()}${short.slice(1)} ${year}`,
  };
}

/** Fetch con manejo uniforme de error y 401 */
async function fetchReport<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (response.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Sesión expirada");
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? "Error al cargar el informe");
  return data as T;
}

/** Carga un informe y reexpone estado de carga/error. */
export function useReport<T>(url: string, refreshToken: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Evita que una respuesta lenta pise a una petición más reciente
  const requestId = useRef(0);

  const load = useCallback(
    async (force: boolean) => {
      const current = ++requestId.current;
      setLoading(true);
      setError(null);

      try {
        const separator = url.includes("?") ? "&" : "?";
        const result = await fetchReport<T>(
          force ? `${url}${separator}refresh=1` : url
        );
        if (current === requestId.current) setData(result);
      } catch (caught) {
        if (current === requestId.current) {
          setError(caught instanceof Error ? caught.message : "Error inesperado");
        }
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    load(refreshToken > 0);
    // `refreshToken` fuerza relectura saltándose la caché del servidor
  }, [load, refreshToken]);

  return { data, loading, error };
}

/**
 * Estado de paginación de una tabla.
 *
 * `reset()` lo llama cualquier cambio de filtro: si el usuario estaba en la
 * página 7 y filtra a 12 resultados, seguir en la 7 mostraría una tabla vacía.
 */
export function usePagination() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const params = useMemo(() => `page=${page}&pageSize=${pageSize}`, [page, pageSize]);

  return {
    page,
    pageSize,
    params,
    reset: useCallback(() => setPage(1), []),
    goTo: setPage,
    changePageSize: useCallback((size: number) => {
      setPageSize(size);
      setPage(1);
    }, []),
    /** Recoge la página que devolvió el servidor, que pudo recortarla. */
    sync: setPage,
  };
}

/**
 * Alinea la página local con la que respondió el servidor. Sin esto, tras un
 * recorte el estado local y el visible se separarían y "Siguiente" saltaría
 * desde un número que ya no existe.
 */
export function useSyncedPage(sync: (page: number) => void, serverPage?: number) {
  useEffect(() => {
    if (serverPage) sync(serverPage);
  }, [sync, serverPage]);
}

/** Une la query de filtros con la de paginación. */
export const withPagination = (filterQuery: string, pageParams: string) =>
  filterQuery ? `${filterQuery}&${pageParams}` : pageParams;

/** Enlace de descarga: el CSV ignora la paginación y exporta todo lo filtrado. */
export const csvHref = (path: string, filterQuery: string) =>
  `${path}?${filterQuery}${filterQuery ? "&" : ""}format=csv`;
