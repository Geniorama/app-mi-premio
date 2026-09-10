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
import { hotelLabel } from "@/lib/hotels";
import { sectorDeEmpresa, type Sector } from "@/lib/sectores";

const ZOHO_CRM_DOMAIN =
  process.env.ZOHO_CRM_DOMAIN || "https://www.zohoapis.com";

const API = `${ZOHO_CRM_DOMAIN}/crm/v6`;

/**
 * Peticiones simultáneas contra Zoho.
 *
 * Solo importa en el informe de lotes, que hace un GET por membresía (≈320).
 * Medido contra el CRM real: con 6 tarda ~20 s, con 15 tarda ~7,5 s y con 25
 * ~4,7 s, sin un solo error. 15 se queda en el límite de concurrencia que Zoho
 * concede a una cuenta Enterprise; los 429 que aun así aparezcan los absorbe el
 * reintento de `zohoGet`.
 */
const FETCH_CONCURRENCY = 15;
/**
 * Tope de seguridad por módulo, en páginas de 200 registros.
 *
 * Membresías y redenciones son cientos; los contactos son el padrón entero de
 * la cadena y no caben en 8.000. El tope existe para que un módulo que crezca
 * sin control no cuelgue el informe, no para recortar datos reales: cuando se
 * alcanza, se avisa en el log.
 */
const MAX_PAGES = 40; // 8.000 registros
const PAGE_SIZE = 200;

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

/**
 * Un afiliado del CRM. No todos llegan a tener membresía: el contacto se crea
 * al vincular la empresa y la membresía solo aparece cuando entra su primer
 * lote de puntos.
 */
export interface ContactRow {
  id: string;
  Full_Name?: string | null;
  Email?: string | null;
  /** Estado del contacto en el CRM; casi todos son "Activo" */
  Estado?: string | null;
  /** Estado en el programa de fidelización. Solo lo tienen los afiliados. */
  Estado_Fidelizaci_n?: string | null;
  Cargo?: string | null;
  /** Lookup: llega como { name, id } */
  Ciudad_Principal?: { name: string; id: string } | null;
  Account_Name?: { name: string; id: string } | null;
  /**
   * Propietario del registro en el CRM: el comercial que atiende a ese
   * afiliado. Es un campo estándar de Zoho y trae también el correo, así que
   * sirve para agrupar sin tener que cruzar contra el módulo Users.
   */
  Owner?: { name: string; id: string; email?: string } | null;
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

/**
 * Un afiliado del programa.
 *
 * Normalmente es una red de membresías (Padre + sus Hijas), pero también hay
 * contactos en el CRM que nunca recibieron puntos: entran aquí con
 * `conMembresia: false` y todas las cifras en cero, para poder comparar el
 * padrón completo contra el que realmente está activo.
 */
export interface AffiliateReportRow {
  /** id de la membresía Padre (raíz de la red); vacío si no tiene membresía */
  rootId: string;
  /** id del contacto en el CRM */
  contactId: string;
  /** false = está en el CRM pero nunca se le abrió membresía */
  conMembresia: boolean;
  email: string;
  nombre: string;
  empresa: string;
  ciudad: string;
  cargo: string;
  membresiaNo: string;
  tipoAfiliado: string;
  estadoFidelizacion: string;
  /**
   * Comercial que atiende al afiliado: el propietario del contacto en Zoho.
   * Vacío si la red no tiene contacto en el padrón activo.
   */
  comercial: string;
  comercialId: string;
  comercialEmail: string;
  /**
   * Sector deducido del nombre de la empresa (ver `lib/sectores.ts`). No hay
   * campo de sector en Zoho: se infiere, y "Corporativo" es el valor por
   * defecto de la regla, no un dato confirmado del CRM.
   */
  sector: Sector;
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
  /**
   * Id de la fila del subformulario. Es lo único que identifica un lote: una
   * misma membresía puede cargar dos lotes el mismo día con el mismo
   * vencimiento (dos órdenes de compra, o una carga partida).
   */
  loteId: string;
  rootId: string;
  membershipId: string;
  membershipName: string;
  email: string;
  nombre: string;
  /** Hotel que originó el lote, extraído de `Entrega_OC` */
  hotel: string;
  /** El `Entrega_OC` en crudo, por si hay que rastrear el registro en el CRM */
  entregaOC: string | null;
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

/**
 * Cargas en marcha, por clave.
 *
 * Sin esto, dos peticiones simultáneas del mismo informe (dos admins, o el
 * doble render de React en desarrollo) lanzan dos recorridos completos de Zoho
 * que compiten por la misma cuota de concurrencia: el informe tarda el doble.
 * Quien llega segundo se cuelga de la carga que ya está corriendo.
 */
const inFlight = new Map<string, Promise<unknown>>();

async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  force = false
): Promise<T> {
  const hit = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!force && hit && Date.now() < hit.expiresAt) return hit.value;

  // También con `force`: una carga que ya está en marcha viene igual de fresca
  // desde Zoho, así que el botón de recargar se cuelga de ella en vez de abrir
  // un segundo recorrido en paralelo.
  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) return running;

  const load = loader()
    .then((value) => {
      cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch((error: unknown) => {
      // Un dato viejo informa mejor que un error: si Zoho falla y quedaba algo
      // en caché, se sirve avisando en el log en vez de tumbar el informe.
      if (hit) {
        console.error(
          `[zoho-reports] Falló la recarga de "${key}"; se sirve la copia en caché.`,
          error
        );
        return hit.value;
      }
      throw error;
    })
    .finally(() => {
      if (inFlight.get(key) === load) inFlight.delete(key);
    });

  inFlight.set(key, load);
  return load;
}

export function clearReportsCache(): void {
  cacheStore.clear();
  inFlight.clear();
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

/** Errores que se reintentan: cuota de concurrencia y caídas pasajeras. */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Con varias decenas de peticiones en paralelo, un 429 puntual de Zoho deja de
 * ser una anécdota. Reintentar con espera creciente evita que un informe se
 * quede sin los lotes de una membresía por un pico de concurrencia.
 */
async function zohoGet<T>(path: string): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    const token = await getZohoAccessToken();

    let response: Response;
    try {
      response = await fetch(`${API}${path}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        cache: "no-store",
      });
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      await sleep(500 * 2 ** attempt);
      continue;
    }

    if (response.status === 204 || response.status === 404) return null;

    if (!response.ok) {
      const detail = await response.text();

      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
        const wait = 500 * 2 ** attempt;
        console.warn(
          `[zoho-reports] ${response.status} en ${path}; reintento ${attempt + 1} en ${wait}ms`
        );
        await sleep(wait);
        continue;
      }

      console.error("[zoho-reports] GET falló:", path, response.status, detail);
      throw new Error(`Zoho ${response.status}: ${detail.slice(0, 200)}`);
    }

    return (await response.json()) as T;
  }
}

/**
 * Recorre un módulo completo. La API v6 pagina con `page_token`; el primer
 * request no lo lleva.
 */
async function listAllRecords<T>(
  module: string,
  fields: string[],
  maxPages: number = MAX_PAGES
): Promise<T[]> {
  const records: T[] = [];
  const fieldsParam = encodeURIComponent(fields.join(","));
  let pageToken: string | null = null;
  let page = 0;

  while (page < maxPages) {
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

  if (page >= maxPages) {
    console.warn(
      `[zoho-reports] ${module}: se alcanzó el tope de ${maxPages} páginas; ` +
        "el informe puede estar incompleto."
    );
  }

  return records;
}

/**
 * Recorre un módulo filtrando en el servidor.
 *
 * A diferencia del listado completo, `/search` pagina con `page` y admite un
 * criterio, así que Zoho devuelve solo lo que interesa. Es la diferencia entre
 * traer 400 registros y recorrer los más de 80.000 contactos de la cadena.
 */
async function searchAllRecords<T>(
  module: string,
  criteria: string,
  fields: string[],
  maxPages = 20
): Promise<T[]> {
  const records: T[] = [];
  const fieldsParam = encodeURIComponent(fields.join(","));
  const criteriaParam = encodeURIComponent(criteria);

  for (let page = 1; page <= maxPages; page++) {
    const result = await zohoGet<ZohoPage<T>>(
      `/${module}/search?criteria=${criteriaParam}&fields=${fieldsParam}` +
        `&per_page=${PAGE_SIZE}&page=${page}`
    );

    // 204 (sin resultados) llega como null: no hay más páginas
    if (!result?.data?.length) break;

    records.push(...result.data);
    if (!result.info?.more_records) break;

    if (page === maxPages) {
      console.warn(
        `[zoho-reports] ${module}/search: se alcanzó el tope de ${maxPages} ` +
          "páginas; el resultado puede estar incompleto."
      );
    }
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

/**
 * Índice `id de membresía → id de la raíz de su red`.
 *
 * La jerarquía de Zoho no siempre tiene dos niveles: hay ciclos colgados de
 * otro ciclo (Padre → Hija → Nieta). Subir un solo escalón partía esas redes
 * en dos filas del informe —el afiliado aparecía dos veces y sus puntos
 * repartidos entre ambas—, así que se sube hasta la raíz.
 *
 * Si el Padre de un registro no está en el listado (dato roto en el CRM), ese
 * registro hace de raíz de su propia red en vez de perderse.
 */
function rootIdMap(memberships: MembershipRow[]): Map<string, string> {
  const byId = new Map(memberships.map((m) => [m.id, m]));
  const roots = new Map<string, string>();

  for (const membership of memberships) {
    if (roots.has(membership.id)) continue;

    const chain: string[] = [];
    let current: MembershipRow = membership;
    const visited = new Set<string>();

    for (;;) {
      chain.push(current.id);
      visited.add(current.id);

      const known = roots.get(current.id);
      if (known) {
        for (const id of chain) roots.set(id, known);
        break;
      }

      const parentId = current.Membresia_Padre?.id;
      const parent = parentId ? byId.get(parentId) : undefined;
      if (!parent || visited.has(parent.id)) {
        for (const id of chain) roots.set(id, current.id);
        break;
      }

      current = parent;
    }
  }

  return roots;
}

/** Agrupa las membresías por red (raíz + todos sus ciclos). */
function groupByNetwork(
  memberships: MembershipRow[]
): Map<string, MembershipRow[]> {
  const roots = rootIdMap(memberships);
  const groups = new Map<string, MembershipRow[]>();

  for (const membership of memberships) {
    const rootId = roots.get(membership.id) ?? membership.id;
    const group = groups.get(rootId);
    if (group) group.push(membership);
    else groups.set(rootId, [membership]);
  }

  return groups;
}

/**
 * Saldo de cada red: la **suma** de los saldos de sus registros.
 *
 * No se usa `Puntos_Globales_Red` de la raíz aunque parezca la cifra oficial:
 * Zoho solo consolida en ese campo un nivel de hijas —deja fuera las nietas— y
 * no lo recalcula al redimir, así que unas veces se queda corto y otras largo.
 * `Saldo_Puntos_Disponibles` de cada registro sí cuadra con su subformulario
 * de puntos (entregados − redimidos − vencidos).
 *
 * Es el mismo criterio que usa `/api/user/membership` para el afiliado, así
 * que el panel y el perfil muestran siempre la misma cifra.
 */
function networkBalances(
  groups: Map<string, MembershipRow[]>
): Map<string, number> {
  const balances = new Map<string, number>();

  for (const [rootId, records] of groups) {
    balances.set(
      rootId,
      records.reduce(
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

const CONTACT_FIELDS = [
  "Full_Name",
  "Email",
  "Estado",
  "Estado_Fidelizaci_n",
  "Cargo",
  "Ciudad_Principal",
  "Account_Name",
  "Owner",
  "Created_Time",
  "Modified_Time",
];

const LIST_TTL_MS = 5 * 60 * 1000;
/**
 * Los lotes son la carga cara (≈320 GET, unos 7 s), así que su caché dura algo
 * más que el intervalo del cron de precalentado (`vercel.json`, cada 30 min):
 * mientras el cron corra, nadie llega a encontrarla caducada.
 */
const LOTS_TTL_MS = 35 * 60 * 1000;

export function listAllMemberships(force = false): Promise<MembershipRow[]> {
  return cached(
    "memberships",
    LIST_TTL_MS,
    () => listAllRecords<MembershipRow>("Membresias", MEMBERSHIP_FIELDS),
    force
  );
}

/**
 * Criterio que separa a un afiliado del programa de cualquier otro contacto
 * del CRM.
 *
 * `Estado` no sirve: casi los 80.000 contactos de la cadena están "Activo".
 * El campo que solo llevan los afiliados es `Estado_Fidelizaci_n`, y "Activo"
 * es el que cuenta — los "Inactivo" salieron del programa.
 */
const AFFILIATE_CRITERIA = "(Estado_Fidelizaci_n:equals:Activo)";

/** Contactos que son afiliados activos del programa. */
export function listAffiliateContacts(force = false): Promise<ContactRow[]> {
  return cached(
    "affiliate-contacts",
    LIST_TTL_MS,
    () =>
      searchAllRecords<ContactRow>("Contacts", AFFILIATE_CRITERIA, CONTACT_FIELDS),
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

/**
 * Estado de la lectura del padrón de contactos.
 *
 * Sin contactos el informe sigue funcionando para quien tiene membresía, pero
 * el comparativo "con y sin membresía" queda sin la mitad de los datos. Si eso
 * pasa hay que decirlo: un "0 sin membresía" se lee como un dato real.
 */
export interface PadronStatus {
  /** false = Zoho no respondió el módulo Contacts */
  disponible: boolean;
  /** true = se alcanzó el tope de páginas y faltan contactos */
  truncado: boolean;
  /** Contactos con `Estado_Fidelizaci_n = Activo` */
  contactos: number;
  /**
   * Redes de membresía cuyo contacto no está en el padrón activo (se dio de
   * baja, o nunca llevó el campo). Siguen listadas porque tienen puntos: no se
   * puede esconder saldo del programa. Se expone para poder depurarlo en Zoho.
   */
  conMembresiaFueraDelPadron: number;
}

export interface AffiliateReport {
  affiliates: AffiliateReportRow[];
  padron: PadronStatus;
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

/**
 * Construye el informe consolidado: una fila por afiliado (red de
 * membresías) más las redenciones enriquecidas y los totales del programa.
 */
export async function buildAffiliateReport(
  force = false
): Promise<AffiliateReport> {
  const [memberships, redemptions, contacts] = await Promise.all([
    listAllMemberships(force),
    listAllRedemptions(force),
    listAffiliateContacts(force).catch((error) => {
      // El padrón es un extra: si Contacts falla, el informe sigue sirviendo
      // para los afiliados que sí tienen membresía.
      console.error("[zoho-reports] No se pudo listar Contacts:", error);
      return [] as ContactRow[];
    }),
  ]);

  const padron: PadronStatus = {
    disponible: contacts.length > 0,
    // La búsqueda de Zoho corta en 2.000 registros; el padrón está muy por
    // debajo, pero si algún día lo alcanza hay que avisarlo y no callarlo.
    truncado: contacts.length >= 2000,
    contactos: contacts.length,
    conMembresiaFueraDelPadron: 0,
  };

  const contactById = new Map(contacts.map((contact) => [contact.id, contact]));
  const contactByEmail = new Map(
    contacts
      .filter((contact) => contact.Email)
      .map((contact) => [contact.Email!.toLowerCase().trim(), contact])
  );

  const groups = groupByNetwork(memberships);
  const balances = networkBalances(groups);

  // membershipId → rootId, para atribuir cada redención a su afiliado
  const rootByMembershipId = rootIdMap(memberships);

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
  /** Contactos ya representados por una red de membresías */
  const usedContacts = new Set<string>();

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

    const contactRef =
      root.Contacto_Membresia ??
      records.find((r) => r.Contacto_Membresia)?.Contacto_Membresia ??
      null;
    const contact =
      (contactRef ? contactById.get(contactRef.id) : undefined) ??
      (email ? contactByEmail.get(email) : undefined);

    if (contact) usedContacts.add(contact.id);

    // La empresa se calcula una vez y de ella sale el sector, para que la
    // columna y el segmento no puedan contradecirse.
    const empresa =
      root.Empresa_Membresia?.name ?? contact?.Account_Name?.name ?? "";

    affiliates.push({
      rootId,
      contactId: contact?.id ?? contactRef?.id ?? "",
      conMembresia: true,
      email: email || contact?.Email?.toLowerCase().trim() || "",
      nombre: contactRef?.name ?? contact?.Full_Name ?? "",
      // La empresa vive en la membresía; si falta, la del contacto sirve igual
      empresa,
      sector: sectorDeEmpresa(empresa),
      ciudad: contact?.Ciudad_Principal?.name ?? "",
      cargo: contact?.Cargo ?? "",
      membresiaNo: root.Membresia_No ?? "",
      tipoAfiliado: root.Tipo_Afiliado_1 ?? "",
      estadoFidelizacion:
        root.Estado_Fidelizaci_n_1 ?? contact?.Estado_Fidelizaci_n ?? "",
      // El comercial cuelga del contacto, no de la membresía: una red sin
      // contacto en el padrón activo se queda sin él.
      comercial: contact?.Owner?.name ?? "",
      comercialId: contact?.Owner?.id ?? "",
      comercialEmail: contact?.Owner?.email ?? "",
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

  // Los contactos que ninguna membresía reclamó: están en el CRM pero nunca
  // recibieron puntos. Van con todas las cifras en cero.
  for (const contact of contacts) {
    if (usedContacts.has(contact.id)) continue;

    affiliates.push({
      rootId: "",
      contactId: contact.id,
      conMembresia: false,
      email: contact.Email?.toLowerCase().trim() ?? "",
      nombre: contact.Full_Name ?? contact.Email ?? "",
      empresa: contact.Account_Name?.name ?? "",
      sector: sectorDeEmpresa(contact.Account_Name?.name),
      ciudad: contact.Ciudad_Principal?.name ?? "",
      cargo: contact.Cargo ?? "",
      membresiaNo: "",
      tipoAfiliado: "",
      estadoFidelizacion: contact.Estado_Fidelizaci_n ?? "",
      comercial: contact.Owner?.name ?? "",
      comercialId: contact.Owner?.id ?? "",
      comercialEmail: contact.Owner?.email ?? "",
      puntosEntregados: 0,
      saldoDisponible: 0,
      puntosRedimidos: 0,
      puntosVencidos: 0,
      puntosPorVencer: 0,
      ciclos: 0,
      redenciones: 0,
      ultimaRedencion: null,
      ultimaActividad: contact.Modified_Time ?? null,
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

  const conMembresia = affiliates.filter((a) => a.conMembresia);
  padron.conMembresiaFueraDelPadron = conMembresia.filter(
    (a) => !a.contactId || !contactById.has(a.contactId)
  ).length;

  const totals: ReportTotals = {
    afiliados: affiliates.length,
    afiliadosConMembresia: conMembresia.length,
    afiliadosSinMembresia: affiliates.length - conMembresia.length,
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

  return { affiliates, redemptions: enriched, totals, padron };
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
    /** Lookup a la orden de compra; su nombre lleva el hotel */
    Entrega_OC?: { name: string; id: string } | null;
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
 * Coste: un GET por membresía (≈320 hoy), pidiendo solo el subformulario. Con
 * la concurrencia actual son unos 7 segundos, cacheados 15 minutos y
 * compartidos con "Puntos por vencer" y "Hoteles"; aun así es el informe más
 * pesado del panel.
 *
 * Por qué no se resuelve de una sola vez: el listado de `Membresias` ignora el
 * subformulario aunque se pida en `fields` (probado contra el CRM), y el
 * módulo `Puntos_Membresia`, que sí se puede listar suelto, son 10.000 filas
 * que Zoho solo pagina con `page_token` — 52 páginas en serie, más lentas que
 * los GET en paralelo.
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
            // Solo el subformulario: el registro completo pesa 3,5 veces más
            // y de él no se usa nada que no venga ya en el listado.
            const result = await zohoGet<{ data: MembershipDetail[] }>(
              `/Membresias/${membership.id}?fields=Puntos_Membresia`
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

      const roots = rootIdMap(memberships);
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

          const entregaOC = lot.Entrega_OC?.name ?? null;

          lots.push({
            loteId: lot.id,
            rootId: roots.get(membership.id) ?? membership.id,
            membershipId: membership.id,
            membershipName: membership.Name ?? membership.id,
            email,
            nombre: membership.Contacto_Membresia?.name ?? "",
            hotel: hotelLabel(entregaOC),
            entregaOC,
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

// ------------------------------------------------------------ precalentado

export interface WarmupLoad {
  clave: string;
  registros: number;
  ms: number;
  error?: string;
}

export interface WarmupResult {
  ok: boolean;
  ms: number;
  cargas: WarmupLoad[];
}

/**
 * Rellena la caché de informes por adelantado, para que ningún administrador
 * pague la carga en frío.
 *
 * Lo llama el cron (`/api/cron/warm-reports`). Fuerza las cuatro listas que
 * sostienen el panel; `listPointsLots` arrastra consigo `memberships`, así que
 * no hace falta pedirlas aparte.
 *
 * Una carga que falle no tumba a las demás: cada una se reporta por separado y
 * el cron devuelve 500 si alguna cayó, para que el fallo se vea en el panel de
 * ejecuciones en vez de pasar en silencio.
 *
 * Aviso de alcance: la caché vive en la memoria del proceso, así que el cron
 * calienta **la instancia que atiende su petición**. Con el tráfico de este
 * panel suele ser la misma que atiende a los admins, pero si el despliegue
 * escala a varias instancias, alguna puede seguir arrancando en frío.
 */
export async function warmReportsCache(): Promise<WarmupResult> {
  const started = Date.now();

  const run = async (
    clave: string,
    load: () => Promise<unknown[]>
  ): Promise<WarmupLoad> => {
    const t = Date.now();
    try {
      const rows = await load();
      return { clave, registros: rows.length, ms: Date.now() - t };
    } catch (error) {
      return {
        clave,
        registros: 0,
        ms: Date.now() - t,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const cargas = await Promise.all([
    run("points-lots", () => listPointsLots(true)),
    run("redemptions", () => listAllRedemptions(true)),
    run("affiliate-contacts", () => listAffiliateContacts(true)),
  ]);

  return {
    ok: cargas.every((carga) => !carga.error),
    ms: Date.now() - started,
    cargas,
  };
}
