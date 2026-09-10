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
  /** Afiliados del CRM con al menos una membresía abierta */
  afiliadosConMembresia: number;
  /** Contactos del CRM que nunca recibieron puntos */
  afiliadosSinMembresia: number;
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
  /** Clave de la fila: los ids de Zoho que la componen, unidos */
  id: string;
  ids: string[];
  nombre: string;
  nombres: string[];
  /** Registros de Zoho que representa la fila (>1 = bono repartido FIFO) */
  tramos: number;
  afiliado: string;
  email: string;
  /** Membresía Padre que agrupa la redención */
  rootId: string;
  membresiaId: string;
  membresiaIds: string[];
  membresia: string;
  membresias: string[];
  puntos: number;
  estado: string;
  estadoRaw: string;
  estadoMixto: boolean;
  fecha: string | null;
  bono: string;
  bonoSlug: string;
  bonoPuntos: number;
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
    /** Puntos redimidos convertidos a pesos */
    valorCOP: number;
    /** Registros de Zoho detrás de esas redenciones (para cuadrar con el CRM) */
    registrosZoho: number;
  };
}

export interface AffiliateRow {
  /** Vacío si el afiliado no tiene membresía */
  rootId: string;
  contactId: string;
  /** false = está en el CRM pero nunca se le abrió membresía */
  conMembresia: boolean;
  email: string;
  nombre: string;
  empresa: string;
  /** Deducido del nombre de la empresa: "Agencia" o "Corporativo" */
  sector: string;
  ciudad: string;
  cargo: string;
  membresiaNo: string;
  tipoAfiliado: string;
  estadoFidelizacion: string;
  /** Comercial que lo atiende: propietario del contacto en Zoho */
  comercial: string;
  comercialId: string;
  comercialEmail: string;
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

export interface AffiliateComparison {
  grupo: "con" | "sin";
  etiqueta: string;
  afiliados: number;
  empresas: number;
  conSaldo: number;
  conRedenciones: number;
  puntosEntregados: number;
  puntosRedimidos: number;
  saldoDisponible: number;
  /** Fracción (0–1) del padrón que representa el grupo */
  participacion: number;
}

/**
 * Un sector del padrón. El sector se deduce del nombre de la empresa
 * ("agencia" en el nombre = Agencia; el resto, Corporativo), porque Zoho no
 * tiene ningún campo que lo diga.
 */
export interface SectorSegment {
  sector: string;
  afiliados: number;
  empresas: number;
  conSaldo: number;
  conRedenciones: number;
  puntosEntregados: number;
  puntosRedimidos: number;
  saldoDisponible: number;
  /** Fracción (0–1) del padrón que representa el sector */
  participacion: number;
}

/** Estado de la lectura del módulo Contacts */
export interface PadronStatus {
  disponible: boolean;
  truncado: boolean;
  /** Afiliados activos del CRM */
  contactos: number;
  /** Redes con puntos cuyo contacto no está en el padrón activo */
  conMembresiaFueraDelPadron: number;
}

export interface AffiliatesData {
  rows: AffiliateRow[];
  pagination: PaginationMeta;
  resumen: {
    afiliados: number;
    conMembresia: number;
    sinMembresia: number;
    /** De los filtrados, cuántos son de agencia */
    agencias: number;
    /** Padrón completo del CRM, al margen de los filtros */
    afiliadosCRM: number;
    puntosEntregados: number;
    puntosRedimidos: number;
    saldoDisponible: number;
  };
  comparativo: AffiliateComparison[];
  /** Segmento por sector, medido sobre el padrón completo */
  porSector: SectorSegment[];
  padron: PadronStatus;
  tipos: string[];
  /** Comerciales presentes en el padrón, para el desplegable del filtro */
  comerciales: Array<{ id: string; nombre: string }>;
}

export interface OwnerRow {
  /** Id del usuario de Zoho; vacío en el grupo sin comercial */
  comercialId: string;
  comercial: string;
  email: string;
  /** Filas del informe de afiliados (redes de membresía + contactos sueltos) */
  afiliados: number;
  /** Personas distintas del CRM */
  contactos: number;
  conMembresia: number;
  sinMembresia: number;
  conSaldo: number;
  conRedenciones: number;
  empresas: number;
  puntosEntregados: number;
  puntosRedimidos: number;
  saldoDisponible: number;
  puntosVencidos: number;
  puntosPorVencer: number;
  redenciones: number;
  /** Afiliados que estrenaron puntos dentro del rango pedido */
  altas: number;
  /** Afiliados suyos que nunca recibieron puntos: no tienen fecha de alta */
  sinAlta: number;
  /** Altas de cada uno de los últimos 12 meses, del más antiguo al más nuevo */
  serie: number[];
  ultimaAlta: string | null;
  valorEntregadoCOP: number;
  valorRedimidoCOP: number;
  /** Fracción (0–1) de los puntos entregados del programa */
  participacion: number;
  /** Redimidos ÷ entregados */
  tasaRedencion: number;
  /** Fracción de sus afiliados que ha redimido al menos una vez */
  tasaActivacion: number;
  ultimaRedencion: string | null;
  ultimaActividad: string | null;
}

export interface OwnersData {
  rows: OwnerRow[];
  pagination: PaginationMeta;
  resumen: {
    comerciales: number;
    afiliados: number;
    /** Altas dentro del rango elegido */
    altas: number;
    /** Altas del último mes de la serie, al margen del rango */
    altasMesActual: number;
    /** Afiliados sin fecha de alta porque nunca recibieron puntos */
    sinAlta: number;
    puntosEntregados: number;
    puntosRedimidos: number;
    saldoDisponible: number;
    tasaRedencion: number;
    /** Afiliados sin propietario identificado en el CRM */
    sinComercial: number;
  };
  /** Los 12 meses de la serie, en `AAAA-MM` y de más antiguo a más nuevo */
  meses: string[];
  serieAltas: Array<{ mes: string; altas: number }>;
  /** El rango realmente aplicado, tal y como lo entendió el servidor */
  rango: { desde: string | null; hasta: string | null };
  padron: PadronStatus;
}

export interface ExpiringRow {
  /** Id del lote en Zoho: la única clave única de la fila */
  loteId: string;
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

export interface PointsMonthRow {
  mes: string;
  cargados: number;
  lotes: number;
  vencidos: number;
  /** De lo cargado ese mes, cuánto sigue vivo hoy */
  vivos: number;
  cargadosCOP: number;
  vencidosCOP: number;
}

export interface PointsData {
  resumen: {
    cargados: number;
    disponibles: number;
    redimidos: number;
    vencidos: number;
    /** Saldo vivo que caduca dentro de `riesgoDias` */
    enRiesgo: number;
    riesgoDias: number;
    lotes: number;
    afiliados: number;
    /** cargados − (disponibles + redimidos + vencidos); debe ser 0 */
    descuadre: number;
  };
  serieMensual: PointsMonthRow[];
  porEstado: Array<{ estado: string; lotes: number; puntos: number }>;
}

export interface HotelRow {
  hotel: string;
  lotes: number;
  puntosEntregados: number;
  puntosRedimidos: number;
  saldoVivo: number;
  puntosVencidos: number;
  afiliados: number;
  membresias: number;
  primeraEntrega: string | null;
  ultimaEntrega: string | null;
  valorEntregadoCOP: number;
  valorRedimidoCOP: number;
  /** Fracción (0–1) de los puntos del programa que emitió el hotel */
  participacion: number;
}

export interface HotelsData {
  rows: HotelRow[];
  pagination: PaginationMeta;
  resumen: {
    hoteles: number;
    puntosEntregados: number;
    puntosRedimidos: number;
    saldoVivo: number;
    lotes: number;
    /** Puntos cuyo lote no identifica hotel */
    sinHotel: number;
  };
}

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
