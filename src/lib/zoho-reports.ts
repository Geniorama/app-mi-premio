/**
 * Capa de lectura agregada de Zoho CRM para el panel administrativo.
 *
 * Decisiones de diseño (verificadas contra el CRM real):
 *
 * - El módulo `Membresias` expone en el **endpoint de lista** los campos
 *   agregados que Zoho ya calcula (`TOTAL_PUNTOS`, `PUNTOS_DIPONIBLES`,
 *   `PUNTOS_VENCIDOS`, `Puntos_Globales_Red`…). Eso permite construir el
 *   informe completo con 2-3 llamadas en vez de una por afiliado.
 * - `PUNTOS_REDIMIDOS` está poblado en muy pocos registros, así que **los
 *   puntos redimidos se calculan desde el módulo `Redenciones`**, no desde
 *   ese campo.
 * - COQL no está disponible: el token OAuth actual responde
 *   `OAUTH_SCOPE_MISMATCH`. Por eso toda la agregación ocurre en el servidor.
 * - El detalle de vencimientos vive en el subformulario `Puntos_Membresia`,
 *   que solo llega en el GET individual. Ese informe sí recorre registro por
 *   registro, con concurrencia limitada y caché.
 */

import { getZohoAccessToken } from "@/lib/zoho";

const ZOHO_CRM_DOMAIN =
  process.env.ZOHO_CRM_DOMAIN || "https://www.zohoapis.com";

const API = `${ZOHO_CRM_DOMAIN}/crm/v6`;

/** Zoho limita la concurrencia por organización; 6 es un valor conservador. */
const FETCH_CONCURRENCY = 6;
const MAX_PAGES = 40; // tope de seguridad: 40 × 200 = 8.000 registros

// --------------------------------------------------------------------- tipos

export interface MembershipRow {
  id: string;
  Name?: string;
  Correo_electr_nico_1?: string;
  Relacion_Membresia?: string | null;
  Membresia_No?: string | null;
  Saldo_Puntos_Disponibles?: number | null;
  Puntos_Globales_Red?: number | null;
  Por_Vencer_Globales_Red?: number | null;
  TOTAL_PUNTOS?: number | null;
  PUNTOS_DIPONIBLES?: number | null;
  PUNTOS_VENCIDOS?: number | null;
  POR_VENCER_PUNTOS?: number | null;
  Puntos_por_Vencer?: number | null;
  Estado_Fidelizaci_n_1?: string | null;
  Tipo_Afiliado_1?: string | null;
  Contacto_Membresia?: { name: string; id: string } | null;
  Empresa_Membresia?: { name: string; id: string } | null;
  Membresia_Padre?: { name: string; id: string } | null;
  Created_Time?: string;
  Modified_Time?: string;
}

export interface RedemptionRow {
  id: string;
  Name?: string;
  Puntos_a_Redimir?: number | null;
  Estado_Redencion?: string | null;
  Redencion_Membresia?: { name: string; id: string } | null;
  Created_Time?: string;
  Modified_Time?: string;
}

/** Un afiliado = una red de membresías (Padre + sus Hijas) */
export interface AffiliateReportRow {
  /** id de la membresía Padre (raíz de la red) */
  rootId: string;
  email: string;
  nombre: string;
  empresa: string;
  membresiaNo: string;
  tipoAfiliado: string;
  estadoFidelizacion: string;
  /** Suma de TOTAL_PUNTOS de la red */
  puntosEntregados: number;
  /** Puntos_Globales_Red del Padre (fallback: suma de saldos) */
  saldoDisponible: number;
  /** Calculado desde el módulo Redenciones */
  puntosRedimidos: number;
  puntosVencidos: number;
  puntosPorVencer: number;
  /** Número de membresías Hija (ciclos) */
  ciclos: number;
  redenciones: number;
  ultimaRedencion: string | null;
  ultimaActividad: string | null;
}

export interface PointsLotRow {
  rootId: string;
  membershipId: string;
  membershipName: string;
  email: string;
  nombre: string;
  puntosEntregados: number;
  puntosRedimidos: number;
  /** Entregados − redimidos: lo que queda vivo en el lote */
  saldoLote: number;
  fechaEntrega: string | null;
  fechaVencimiento: string | null;
  estado: string;
  /** Días desde hoy hasta el vencimiento (negativo = ya venció) */
  diasParaVencer: number | null;
}

// --------------------------------------------------------------------- caché

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Caché en memoria del proceso. Igual que el token de Zoho y los códigos de
 * login, NO se comparte entre instancias serverless: cada una mantiene la
 * suya. Es aceptable para informes (los datos solo se ven más frescos de lo
 * necesario), pero conviene saberlo.
 */
const cacheStore = new Map<string, CacheEntry<unknown>>();

async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  force = false
): Promise<T> {
  const hit = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!force && hit && Date.now() < hit.expiresAt) return hit.value;

  const value = await loader();
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function clearReportsCache(): void {
  cacheStore.clear();
}

// ---------------------------------------------------------------- utilidades

interface ZohoPage<T> {
  data?: T[];
  info?: {
    more_records?: boolean;
    next_page_token?: string | null;
    count?: number;
  };
}

async function zohoGet<T>(path: string): Promise<T | null> {
  const token = await getZohoAccessToken();
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    cache: "no-store",
  });

  if (response.status === 204 || response.status === 404) return null;

  if (!response.ok) {
    const detail = await response.text();
    console.error("[zoho-reports] GET falló:", path, response.status, detail);
    throw new Error(`Zoho ${response.status}: ${detail.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

/**
 * Recorre un módulo completo. La API v6 pagina con `page_token`; el primer
 * request no lo lleva.
 */
async function listAllRecords<T>(
  module: string,
  fields: string[]
): Promise<T[]> {
  const records: T[] = [];
  const fieldsParam = encodeURIComponent(fields.join(","));
  let pageToken: string | null = null;
  let page = 0;

  while (page < MAX_PAGES) {
    const query: string =
      `/${module}?fields=${fieldsParam}&per_page=200` +
      (pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : "");

    const result: ZohoPage<T> | null = await zohoGet<ZohoPage<T>>(query);
    if (!result?.data?.length) break;

    records.push(...result.data);
    page += 1;

    if (!result.info?.more_records || !result.info?.next_page_token) break;
    pageToken = result.info.next_page_token;
  }

  if (page >= MAX_PAGES) {
    console.warn(
      `[zoho-reports] ${module}: se alcanzó el tope de ${MAX_PAGES} páginas; ` +
        "el informe puede estar incompleto."
    );
  }

  return records;
}

/** Ejecuta tareas con un límite de concurrencia. */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await task(items[index]);
      }
    })()
  );

  await Promise.all(workers);
  return results;
}

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * El nombre de una membresía suele ser `correo@dominio_ME11 - Ciclo …`.
 * Sirve de respaldo cuando `Correo_electr_nico_1` viene vacío.
 */
function emailFromMembershipName(name?: string | null): string {
  if (!name) return "";
  const candidate = name.split("_")[0]?.trim() ?? "";
  return candidate.includes("@") ? candidate.toLowerCase() : "";
}

/** Raíz de la red: la Padre si el registro es Hija, o él mismo. */
const rootIdOf = (m: MembershipRow): string => m.Membresia_Padre?.id ?? m.id;

/** Agrupa las membresías por red (Padre + sus Hijas). */
function groupByNetwork(
  memberships: MembershipRow[]
): Map<string, MembershipRow[]> {
  const groups = new Map<string, MembershipRow[]>();

  for (const membership of memberships) {
    const rootId = rootIdOf(membership);
    const group = groups.get(rootId);
    if (group) group.push(membership);
    else groups.set(rootId, [membership]);
  }

  return groups;
}

/**
 * Saldo autoritativo de cada red. `Puntos_Globales_Red` del Padre es la cifra
 * que Zoho consolida; si viene vacía se cae a la suma de saldos por registro.
 *
 * Es el mismo criterio que usa `/api/user/membership` para el afiliado, así
 * que el panel y el perfil muestran siempre la misma cifra.
 */
function networkBalances(
  groups: Map<string, MembershipRow[]>
): Map<string, number> {
  const balances = new Map<string, number>();

  for (const [rootId, records] of groups) {
    const root = records.find((record) => record.id === rootId) ?? records[0];
    balances.set(
      rootId,
      root.Puntos_Globales_Red != null
        ? num(root.Puntos_Globales_Red)
        : records.reduce(
            (total, record) => total + num(record.Saldo_Puntos_Disponibles),
            0
          )
    );
  }

  return balances;
}

/**
 * Normaliza estados de Zoho (tildes/mayúsculas) a las claves del informe.
 * Mismo criterio que `mapEstadoRedencion` del cron de sincronización.
 */
export function normalizeRedemptionStatus(raw?: string | null): string {
  if (!raw) return "sin_estado";
  const value = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .toLowerCase()
    .trim();

  if (value.startsWith("entrega")) return "entregada";
  if (value.startsWith("aprob") || value.startsWith("proces")) return "procesada";
  if (value.startsWith("rechaz")) return "rechazada";
  if (value.startsWith("cancel")) return "cancelada";
  if (value.startsWith("cread") || value.startsWith("pend")) return "pendiente";
  return value.replace(/\s+/g, "_");
}

/** Estados que no descuentan puntos del programa */
const NON_CONSUMING_STATUSES = new Set(["cancelada", "rechazada"]);

// ------------------------------------------------------------------ fetchers

const MEMBERSHIP_FIELDS = [
  "Name",
  "Correo_electr_nico_1",
  "Relacion_Membresia",
  "Membresia_No",
  "Saldo_Puntos_Disponibles",
  "Puntos_Globales_Red",
  "Por_Vencer_Globales_Red",
  "TOTAL_PUNTOS",
  "PUNTOS_DIPONIBLES",
  "PUNTOS_VENCIDOS",
  "POR_VENCER_PUNTOS",
  "Puntos_por_Vencer",
  "Estado_Fidelizaci_n_1",
  "Tipo_Afiliado_1",
  "Contacto_Membresia",
  "Empresa_Membresia",
  "Membresia_Padre",
  "Created_Time",
  "Modified_Time",
];

const REDEMPTION_FIELDS = [
  "Name",
  "Puntos_a_Redimir",
  "Estado_Redencion",
  "Redencion_Membresia",
  "Created_Time",
  "Modified_Time",
];

const LIST_TTL_MS = 5 * 60 * 1000;
const LOTS_TTL_MS = 15 * 60 * 1000;

export function listAllMemberships(force = false): Promise<MembershipRow[]> {
  return cached(
    "memberships",
    LIST_TTL_MS,
    () => listAllRecords<MembershipRow>("Membresias", MEMBERSHIP_FIELDS),
    force
  );
}

export function listAllRedemptions(force = false): Promise<RedemptionRow[]> {
  return cached(
    "redemptions",
    LIST_TTL_MS,
    () => listAllRecords<RedemptionRow>("Redenciones", REDEMPTION_FIELDS),
    force
  );
}

// ---------------------------------------------------------------- agregación

export interface AffiliateReport {
  affiliates: AffiliateReportRow[];
  /** Redenciones enriquecidas con el correo del afiliado */
  redemptions: EnrichedRedemption[];
  totals: ReportTotals;
}

export interface EnrichedRedemption {
  id: string;
  nombre: string;
  email: string;
  afiliado: string;
  membresiaNombre: string;
  membresiaId: string;
  rootId: string;
  puntos: number;
  estado: string;
  estadoRaw: string;
  fecha: string | null;
  modificado: string | null;
}

export interface ReportTotals {
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

/**
 * Construye el informe consolidado: una fila por afiliado (red de
 * membresías) más las redenciones enriquecidas y los totales del programa.
 */
export async function buildAffiliateReport(
  force = false
): Promise<AffiliateReport> {
  const [memberships, redemptions] = await Promise.all([
    listAllMemberships(force),
    listAllRedemptions(force),
  ]);

  const groups = groupByNetwork(memberships);
  const balances = networkBalances(groups);

  // membershipId → rootId, para atribuir cada redención a su afiliado
  const rootByMembershipId = new Map(
    memberships.map((membership) => [membership.id, rootIdOf(membership)])
  );

  // Redenciones agrupadas por afiliado
  const redemptionsByRoot = new Map<string, EnrichedRedemption[]>();
  const enriched: EnrichedRedemption[] = [];

  for (const redemption of redemptions) {
    const membershipId = redemption.Redencion_Membresia?.id ?? "";
    const membershipName = redemption.Redencion_Membresia?.name ?? "";
    const rootId = rootByMembershipId.get(membershipId) ?? membershipId;

    const item: EnrichedRedemption = {
      id: redemption.id,
      nombre: redemption.Name ?? redemption.id,
      email: emailFromMembershipName(membershipName),
      afiliado: "",
      membresiaNombre: membershipName,
      membresiaId: membershipId,
      rootId,
      puntos: num(redemption.Puntos_a_Redimir),
      estado: normalizeRedemptionStatus(redemption.Estado_Redencion),
      estadoRaw: redemption.Estado_Redencion ?? "",
      fecha: redemption.Created_Time ?? null,
      modificado: redemption.Modified_Time ?? null,
    };

    enriched.push(item);
    const bucket = redemptionsByRoot.get(rootId);
    if (bucket) bucket.push(item);
    else redemptionsByRoot.set(rootId, [item]);
  }

  const affiliates: AffiliateReportRow[] = [];

  for (const [rootId, records] of groups) {
    const root = records.find((r) => r.id === rootId) ?? records[0];
    const children = records.filter((r) => r.id !== root.id);

    const email =
      root.Correo_electr_nico_1?.toLowerCase().trim() ||
      records.find((r) => r.Correo_electr_nico_1)?.Correo_electr_nico_1
        ?.toLowerCase()
        .trim() ||
      emailFromMembershipName(root.Name) ||
      "";

    const affiliateRedemptions = redemptionsByRoot.get(rootId) ?? [];
    const consuming = affiliateRedemptions.filter(
      (r) => !NON_CONSUMING_STATUSES.has(r.estado)
    );

    const sum = (pick: (m: MembershipRow) => unknown) =>
      records.reduce((total, m) => total + num(pick(m)), 0);

    const saldoDisponible = balances.get(rootId) ?? 0;

    const puntosPorVencer =
      root.Por_Vencer_Globales_Red != null
        ? num(root.Por_Vencer_Globales_Red)
        : sum((m) => m.Puntos_por_Vencer ?? m.POR_VENCER_PUNTOS);

    const fechas = records
      .map((m) => m.Modified_Time)
      .filter((f): f is string => Boolean(f))
      .sort();

    const fechasRedencion = consuming
      .map((r) => r.fecha)
      .filter((f): f is string => Boolean(f))
      .sort();

    affiliates.push({
      rootId,
      email,
      nombre: root.Contacto_Membresia?.name ?? records.find((r) => r.Contacto_Membresia)?.Contacto_Membresia?.name ?? "",
      empresa: root.Empresa_Membresia?.name ?? "",
      membresiaNo: root.Membresia_No ?? "",
      tipoAfiliado: root.Tipo_Afiliado_1 ?? "",
      estadoFidelizacion: root.Estado_Fidelizaci_n_1 ?? "",
      puntosEntregados: sum((m) => m.TOTAL_PUNTOS),
      saldoDisponible,
      puntosRedimidos: consuming.reduce((total, r) => total + r.puntos, 0),
      puntosVencidos: sum((m) => m.PUNTOS_VENCIDOS),
      puntosPorVencer,
      ciclos: children.length,
      redenciones: affiliateRedemptions.length,
      ultimaRedencion: fechasRedencion[fechasRedencion.length - 1] ?? null,
      ultimaActividad: fechas[fechas.length - 1] ?? null,
    });
  }

  // Nombre del afiliado en cada redención (para la tabla y el CSV)
  const nameByRoot = new Map(affiliates.map((a) => [a.rootId, a]));
  for (const item of enriched) {
    const affiliate = nameByRoot.get(item.rootId);
    if (affiliate) {
      item.afiliado = affiliate.nombre || affiliate.email;
      if (!item.email) item.email = affiliate.email;
    }
  }

  affiliates.sort((a, b) => b.puntosEntregados - a.puntosEntregados);
  enriched.sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));

  const redencionesPorEstado: Record<string, number> = {};
  const puntosPorEstado: Record<string, number> = {};
  for (const item of enriched) {
    redencionesPorEstado[item.estado] =
      (redencionesPorEstado[item.estado] ?? 0) + 1;
    puntosPorEstado[item.estado] = (puntosPorEstado[item.estado] ?? 0) + item.puntos;
  }

  const totals: ReportTotals = {
    afiliados: affiliates.length,
    afiliadosConSaldo: affiliates.filter((a) => a.saldoDisponible > 0).length,
    membresias: memberships.length,
    puntosEntregados: affiliates.reduce((t, a) => t + a.puntosEntregados, 0),
    saldoDisponible: affiliates.reduce((t, a) => t + a.saldoDisponible, 0),
    puntosRedimidos: affiliates.reduce((t, a) => t + a.puntosRedimidos, 0),
    puntosVencidos: affiliates.reduce((t, a) => t + a.puntosVencidos, 0),
    puntosPorVencer: affiliates.reduce((t, a) => t + a.puntosPorVencer, 0),
    redenciones: enriched.length,
    redencionesPorEstado,
    puntosPorEstado,
  };

  return { affiliates, redemptions: enriched, totals };
}

// -------------------------------------------------- lotes de puntos (vencer)

interface MembershipDetail extends MembershipRow {
  Puntos_Membresia?: Array<{
    id: string;
    Puntos_Entregados?: number | null;
    Puntos_Redimidos?: number | null;
    Fecha_de_Entrega?: string | null;
    Fecha_de_vencimiento_Puntos?: string | null;
    Estado_Puntos_Entregados?: string | null;
    Se_Redimen?: boolean;
  }>;
}

/**
 * Ajusta los lotes al saldo real de cada red consumiendo **FIFO**.
 *
 * Por qué hace falta: Zoho casi nunca escribe `Puntos_Redimidos` de vuelta en
 * la fila del subformulario — el consumo se refleja en el saldo del registro.
 * Sin este ajuste, la suma de lotes de un afiliado que ya redimió supera su
 * saldo disponible y el informe de vencimientos sobreestima.
 *
 * El consumo se aplica sobre los lotes más antiguos primero, que es
 * exactamente la regla del programa (los puntos viejos se gastan antes).
 */
function reconcileLotsWithBalance(
  lots: PointsLotRow[],
  balances: Map<string, number>
): void {
  const byNetwork = new Map<string, PointsLotRow[]>();

  for (const lot of lots) {
    const group = byNetwork.get(lot.rootId);
    if (group) group.push(lot);
    else byNetwork.set(lot.rootId, [lot]);
  }

  for (const [rootId, group] of byNetwork) {
    const balance = balances.get(rootId);
    if (balance === undefined) continue;

    const lotTotal = group.reduce((total, lot) => total + lot.saldoLote, 0);
    let pending = lotTotal - balance;
    if (pending <= 0) continue;

    const fifo = [...group].sort((a, b) =>
      (a.fechaEntrega ?? "").localeCompare(b.fechaEntrega ?? "")
    );

    for (const lot of fifo) {
      if (pending <= 0) break;
      const taken = Math.min(lot.saldoLote, pending);
      lot.saldoLote -= taken;
      lot.puntosRedimidos += taken;
      pending -= taken;
    }
  }
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * Trae el subformulario `Puntos_Membresia` de cada membresía y lo aplana en
 * lotes de puntos con su fecha de vencimiento.
 *
 * Coste: un GET por membresía (≈300 hoy). Va cacheado 15 minutos y con
 * concurrencia limitada; aun así es el informe más pesado del panel.
 */
export async function listPointsLots(force = false): Promise<PointsLotRow[]> {
  return cached(
    "points-lots",
    LOTS_TTL_MS,
    async () => {
      const memberships = await listAllMemberships(force);

      const details = await mapWithLimit(
        memberships,
        FETCH_CONCURRENCY,
        async (membership) => {
          try {
            const result = await zohoGet<{ data: MembershipDetail[] }>(
              `/Membresias/${membership.id}`
            );
            return { membership, detail: result?.data?.[0] ?? null };
          } catch (error) {
            console.error(
              "[zoho-reports] No se pudo traer la membresía",
              membership.id,
              error
            );
            return { membership, detail: null };
          }
        }
      );

      const lots: PointsLotRow[] = [];

      for (const { membership, detail } of details) {
        if (!detail?.Puntos_Membresia?.length) continue;

        const email =
          membership.Correo_electr_nico_1?.toLowerCase().trim() ||
          emailFromMembershipName(membership.Name);

        for (const lot of detail.Puntos_Membresia) {
          const estado = lot.Estado_Puntos_Entregados ?? "";

          // Un lote anulado ya no representa puntos redimibles: coincide con
          // lo que Zoho reporta en PUNTOS_VENCIDOS.
          if (/^cancel/i.test(estado.normalize("NFD"))) continue;

          const entregados = num(lot.Puntos_Entregados);
          const redimidos = num(lot.Puntos_Redimidos);
          const vencimiento = lot.Fecha_de_vencimiento_Puntos ?? null;

          lots.push({
            rootId: rootIdOf(membership),
            membershipId: membership.id,
            membershipName: membership.Name ?? membership.id,
            email,
            nombre: membership.Contacto_Membresia?.name ?? "",
            puntosEntregados: entregados,
            puntosRedimidos: redimidos,
            saldoLote: Math.max(entregados - redimidos, 0),
            fechaEntrega: lot.Fecha_de_Entrega ?? null,
            fechaVencimiento: vencimiento,
            estado,
            diasParaVencer: daysUntil(vencimiento),
          });
        }
      }

      reconcileLotsWithBalance(lots, networkBalances(groupByNetwork(memberships)));

      lots.sort((a, b) =>
        (a.fechaVencimiento ?? "9999").localeCompare(b.fechaVencimiento ?? "9999")
      );

      return lots;
    },
    force
  );
}
