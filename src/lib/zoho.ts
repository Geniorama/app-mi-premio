/**
 * Utilidades para integrar con la API de Zoho CRM
 */

const ZOHO_ACCOUNTS_DOMAIN =
  process.env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.com";
const ZOHO_CRM_DOMAIN =
  process.env.ZOHO_CRM_DOMAIN || "https://www.zohoapis.com";

export interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  api_domain?: string;
}

/**
 * La caché del access token cuelga de `globalThis` y no del módulo.
 *
 * Zoho limita con dureza las llamadas al endpoint de refresh (responde
 * "You have made too many requests continuously"). En desarrollo, cada
 * recompilación recarga este módulo: con la caché en una variable de módulo se
 * perdía el token en cada guardado y se pedía uno nuevo, hasta agotar el
 * límite. `globalThis` sobrevive al hot reload.
 *
 * En producción no cambia nada: cada instancia serverless sigue teniendo su
 * propia caché, igual que antes.
 */
interface ZohoTokenCache {
  token: string | null;
  expiresAt: number;
}

const tokenCache: ZohoTokenCache = ((
  globalThis as { __zohoTokenCache?: ZohoTokenCache }
).__zohoTokenCache ??= { token: null, expiresAt: 0 });

/**
 * Obtiene un access token válido usando el refresh token.
 * Cachea el token hasta que expire (con 5 min de margen).
 */
export async function getZohoAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    // Sin log: el precalentado de informes pasa por aquí ~330 veces cada media
    // hora y esta línea ahogaba el resto. Lo que interesa —cuándo se pide un
    // token nuevo— sí se registra abajo.
    return tokenCache.token;
  }

  console.log("[Zoho] Solicitando nuevo access token...");
  const response = await fetch(
    `${ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token?` +
      new URLSearchParams({
        refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        grant_type: "refresh_token",
      }),
    { method: "POST" }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("[Zoho] Error de conexión al obtener token:", response.status, error);
    throw new Error(`Zoho token error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as ZohoTokenResponse;
  tokenCache.token = data.access_token;
  tokenCache.expiresAt = now + data.expires_in * 1000;

  console.log("[Zoho] Conexión exitosa: Access token obtenido correctamente");
  return data.access_token;
}

export interface ZohoContact {
  id: string;
  Email?: string;
  First_Name?: string;
  Last_Name?: string;
  Full_Name?: string;
  Estado_Fidelizaci_n?: string;
  Estado?: string;
  Phone?: string;
  Mobile?: string;
  /** Cargo (campo personalizado; el estándar Title viene vacío) */
  Cargo?: string;
  /** Lookup al módulo Accounts: Zoho lo devuelve como objeto */
  Account_Name?: { name: string; id: string } | null;
  /** Lookup de ciudad; el name ya incluye "Ciudad / Departamento / País" */
  Ciudad_Principal?: { name: string; id: string } | null;
  Date_of_Birth?: string;
}

/** Valida que el contacto pueda acceder (Estado y Estado_Fidelizaci_n = Activo) */
export function isContactEligibleForLogin(contact: ZohoContact | null): boolean {
  if (!contact) return false;
  return (
    contact.Estado_Fidelizaci_n === "Activo" && contact.Estado === "Activo"
  );
}

export interface ZohoSearchResponse {
  data: ZohoContact[];
  info: {
    count: number;
    more_records: boolean;
  };
}

export interface ZohoRedemption {
  id: string;
  Name?: string;
  Puntos_a_Redimir?: number;
  Estado_Redencion?: string;
  Created_Time?: string;
}

/**
 * Obtiene el historial de redenciones de un contacto buscando por email
 * en el campo Redencion_Membresia del módulo Redenciones.
 */
export async function getRedemptionsByEmail(
  email: string
): Promise<ZohoRedemption[]> {
  const token = await getZohoAccessToken();

  const criteria = `(Redencion_Membresia:equals:${email})`;
  const url =
    `${ZOHO_CRM_DOMAIN}/crm/v6/Redenciones/search` +
    `?criteria=${encodeURIComponent(criteria)}&per_page=50&sort_by=Created_Time&sort_order=desc`;

  const response = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (response.status === 204) {
    console.log(`[Zoho] Sin redenciones para: ${email}`);
    return [];
  }

  if (!response.ok) {
    const error = await response.text();
    console.error("[Zoho] Error buscando redenciones:", response.status, error);
    throw new Error(`Zoho CRM redemptions error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as ZohoListResponse<ZohoRedemption>;
  console.log(`[Zoho] ${result.data?.length ?? 0} redenciones encontradas para: ${email}`);
  return result.data ?? [];
}

export interface ZohoPuntoMembresia {
  id: string;
  LinkingModule10_Serial_Number?: string;
  Puntos_Entregados?: number;
  Puntos_Redimidos?: number | null;
  Fecha_de_Entrega?: string;
  Fecha_de_vencimiento_Puntos?: string;
  Estado_Puntos_Entregados?: string;
  Entrega_OC?: { name: string; id: string } | null;
  Redencion_No?: { name: string; id: string } | null;
  Se_Redimen?: boolean;
}

export interface ZohoMembership {
  id: string;
  Name?: string;
  /** Campo "Correo electrónico 1" del registro de membresía */
  Correo_electr_nico_1?: string;
  Saldo_Puntos_Disponibles?: number;
  /** Saldo consolidado de toda la red (solo poblado en membresías Padre) */
  Puntos_Globales_Red?: number | null;
  /** "Padre" (cuenta global del afiliado) o "Hija" (un ciclo) */
  Relacion_Membresia?: string;
  /** Lookup a la membresía Padre (solo en Hijas) */
  Membresia_Padre?: { name: string; id: string } | null;
  /** ID de la hija activa más reciente (solo en el Padre) */
  ID_Ultima_Hija_Activa?: string | null;
  /** Hijas relacionadas (solo en el Padre) */
  Membresias_Hijas_Relacionadas?: Array<{
    id: string;
    Membresia_Hija_Lookup?: { name: string; id: string } | null;
    Saldo_Puntos_Disponibles_Hija?: number | null;
  }> | null;
  /** Ajustar al nombre API real del campo de categoría */
  Categor_a?: string;
  /** Lookup a la empresa (Accounts) dueña de la membresía */
  Empresa_Membresia?: { name: string; id: string } | null;
  Created_Time?: string;
  /** Subformulario Puntos Membresía */
  Puntos_Membresia?: ZohoPuntoMembresia[];
  /**
   * Registros de la red (Padre + Hijas) con saldo, ordenados FIFO por la
   * fecha de entrega más antigua de sus puntos. Calculado por
   * getMembershipByEmail; no es un campo de Zoho.
   */
  redFifo?: ZohoMembershipRedRecord[];
}

/** Registro individual de la red de membresías, para asignación FIFO */
export interface ZohoMembershipRedRecord {
  id: string;
  nombre: string;
  saldo: number;
  /** Fecha de entrega más antigua del subform de puntos del registro */
  puntosMasAntiguos: string | null;
}

interface ZohoListResponse<T> {
  data: T[];
  info: { count: number; more_records: boolean };
}

/**
 * Busca membresías por un criterio GROQ-like de Zoho.
 * Devuelve los registros parciales del listado (vacío si Zoho responde 204).
 */
async function searchMembershipsByCriteria(
  token: string,
  criteria: string
): Promise<ZohoMembership[]> {
  const searchUrl =
    `${ZOHO_CRM_DOMAIN}/crm/v6/Membresias/search` +
    `?criteria=${encodeURIComponent(criteria)}&per_page=200`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (searchRes.status === 204) return [];

  if (!searchRes.ok) {
    const error = await searchRes.text();
    console.error("[Zoho] Error buscando membresía:", searchRes.status, error);
    throw new Error(`Zoho CRM membership error: ${searchRes.status} - ${error}`);
  }

  const searchResult =
    (await searchRes.json()) as ZohoListResponse<ZohoMembership>;
  return searchResult.data ?? [];
}

/** Trae un registro completo del módulo Membresias por ID (incluye subforms) */
async function getMembershipRecordById(
  token: string,
  id: string
): Promise<ZohoMembership | null> {
  const response = await fetch(`${ZOHO_CRM_DOMAIN}/crm/v6/Membresias/${id}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (!response.ok) {
    console.warn(`[Zoho] No se pudo traer membresía ${id}: ${response.status}`);
    return null;
  }

  const result = (await response.json()) as ZohoListResponse<ZohoMembership>;
  return result.data?.[0] ?? null;
}

/** Trae un registro por ID sin repetir llamadas dentro de la misma consulta. */
type RecordFetcher = (id: string) => Promise<ZohoMembership | null>;

/**
 * Sube por `Membresia_Padre` hasta la raíz de la red de membresías.
 *
 * No basta con mirar si el registro tiene Padre: la búsqueda por correo puede
 * devolver cualquier eslabón de la cadena —incluida la propia raíz— y hay
 * redes de tres niveles (Padre → Hija → Nieta), así que se sube hasta que ya
 * no haya a dónde.
 */
async function resolveNetworkRoot(
  fetchRecord: RecordFetcher,
  record: ZohoMembership
): Promise<ZohoMembership> {
  let current = record;
  const visited = new Set<string>([current.id]);

  while (current.Membresia_Padre?.id) {
    const parentId = current.Membresia_Padre.id;
    if (visited.has(parentId)) break; // ciclo en los datos: se corta aquí
    visited.add(parentId);

    const parent = await fetchRecord(parentId);
    if (!parent) break;
    current = parent;
  }

  return current;
}

/**
 * Recorre la red hacia abajo desde la raíz, nivel a nivel.
 *
 * Zoho enlaza cada registro con sus hijas directas en
 * `Membresias_Hijas_Relacionadas`; recorrerlo en anchura recoge también las
 * nietas, que existen en el CRM aunque no sean la norma.
 *
 * Ese enlace no siempre está completo (hay ciclos que el CRM no listó en su
 * Padre), así que quien llama debe unir el resultado con los registros que la
 * búsqueda por correo encontró por su cuenta.
 */
async function collectNetworkRecords(
  fetchRecord: RecordFetcher,
  root: ZohoMembership
): Promise<ZohoMembership[]> {
  const byId = new Map<string, ZohoMembership>([[root.id, root]]);
  let frontier = [root];

  while (frontier.length > 0) {
    const pending = [
      ...new Set(
        frontier
          .flatMap((record) => record.Membresias_Hijas_Relacionadas ?? [])
          .map((link) => link.Membresia_Hija_Lookup?.id)
          .filter((id): id is string => Boolean(id))
          .filter((id) => !byId.has(id))
      ),
    ];

    if (pending.length === 0) break;

    const children = (
      await Promise.all(pending.map((id) => fetchRecord(id)))
    ).filter((m): m is ZohoMembership => m !== null);

    for (const child of children) byId.set(child.id, child);
    frontier = children;
  }

  return [...byId.values()];
}

/**
 * Busca la membresía de un contacto por email y devuelve su red consolidada.
 *
 * En Zoho el afiliado no es un registro sino una **red**: una membresía raíz
 * ("Padre") y un registro por ciclo colgando de ella —a veces con otro ciclo
 * colgando de un ciclo—. Cada registro solo conoce sus propios puntos en
 * `Saldo_Puntos_Disponibles`.
 *
 * La red se arma por los dos extremos porque ninguno basta solo: la búsqueda
 * por correo no encuentra las raíces (muchas no lo tienen) y el enlace de
 * hijas de la raíz a veces deja registros fuera.
 *
 * El saldo que se le muestra al afiliado es la **suma de toda la red**, no un
 * campo de Zoho:
 *
 * - `Saldo_Puntos_Disponibles` de un solo registro es un saldo parcial (era la
 *   causa de que la web mostrara menos puntos de los que el afiliado tiene).
 * - `Puntos_Globales_Red` de la raíz tampoco sirve: Zoho solo consolida en él
 *   un nivel de hijas —deja fuera las nietas— y no lo recalcula al redimir,
 *   así que unas veces se queda corto y otras largo.
 *
 * Devuelve una membresía con:
 * - `Saldo_Puntos_Disponibles` = saldo sumado de toda la red
 * - `Puntos_Membresia` = historial agregado de todos los registros
 * - `redFifo` = registros con saldo, del más antiguo al más reciente
 * - `id` = registro con los puntos más antiguos (destino FIFO por defecto)
 */
export async function getMembershipByEmail(
  email: string
): Promise<ZohoMembership | null> {
  const token = await getZohoAccessToken();

  // Una red se recorre por arriba y por abajo, y los caminos se cruzan: sin
  // memoria, el mismo registro se pediría varias veces en una sola consulta.
  const records = new Map<string, ZohoMembership | null>();
  const fetchRecord: RecordFetcher = async (id) => {
    const known = records.get(id);
    if (known !== undefined) return known;
    const record = await getMembershipRecordById(token, id);
    records.set(id, record);
    return record;
  };

  // Paso 1: todos los registros que llevan el correo del afiliado.
  // El email suele vivir en "Correo electrónico 1" (Correo_electr_nico_1),
  // pero algunos afiliados solo lo tienen en el "Nombre de Membresía" (Name)
  // —típicamente registros Padre—, así que se hace fallback a buscar por Name.
  let encontradas = await searchMembershipsByCriteria(
    token,
    `(Correo_electr_nico_1:equals:${email})`
  );
  if (encontradas.length === 0) {
    encontradas = await searchMembershipsByCriteria(
      token,
      `(Name:equals:${email})`
    );
    if (encontradas.length > 0) {
      console.log(`[Zoho] Membresías encontradas por Name para: ${email}`);
    }
  }
  if (encontradas.length === 0) {
    console.log(`[Zoho] Membresía NO encontrada para: ${email}`);
    return null;
  }

  console.log(
    `[Zoho] ${encontradas.length} membresía(s) encontradas para: ${email}`
  );

  // Paso 2: traer cada una completa (el listado no incluye subformularios)
  const semillas = (
    await Promise.all(
      encontradas.map(async (m) => (await fetchRecord(m.id)) ?? m)
    )
  ).filter((m): m is ZohoMembership => Boolean(m));

  // Paso 3: subir a la raíz de cada semilla y bajar por toda su red
  const raices = new Map<string, ZohoMembership>();
  for (const semilla of semillas) {
    const raiz = await resolveNetworkRoot(fetchRecord, semilla);
    if (!raices.has(raiz.id)) raices.set(raiz.id, raiz);
  }

  const redPorId = new Map<string, ZohoMembership>();
  for (const raiz of raices.values()) {
    for (const record of await collectNetworkRecords(fetchRecord, raiz)) {
      redPorId.set(record.id, record);
    }
  }

  // Los registros que la raíz no listó entre sus hijas no pueden quedarse
  // fuera del saldo: la búsqueda por correo ya los encontró.
  for (const semilla of semillas) {
    if (redPorId.has(semilla.id)) continue;
    console.warn(
      `[Zoho] ${semilla.Name ?? semilla.id} no aparece colgando de su raíz;` +
        ` se agrega a la red de ${email}`
    );
    redPorId.set(semilla.id, semilla);
  }

  const registrosRed = [...redPorId.values()];
  const raizPrincipal = await resolveNetworkRoot(fetchRecord, semillas[0]);

  const puntosConsolidados = registrosRed
    .flatMap((m) => m.Puntos_Membresia ?? [])
    .sort((a, b) =>
      (b.Fecha_de_Entrega ?? "").localeCompare(a.Fecha_de_Entrega ?? "")
    );

  // Red ordenada FIFO: primero el registro cuyos puntos son más antiguos.
  // Las redenciones deben consumir los puntos más antiguos primero.
  const redFifo: ZohoMembershipRedRecord[] = registrosRed
    .map((m) => {
      const fechas = (m.Puntos_Membresia ?? [])
        .map((p) => p.Fecha_de_Entrega)
        .filter((f): f is string => Boolean(f))
        .sort();
      return {
        id: m.id,
        nombre: m.Name ?? m.id,
        saldo: m.Saldo_Puntos_Disponibles ?? 0,
        puntosMasAntiguos: fechas[0] ?? m.Created_Time ?? null,
      };
    })
    .filter((r) => r.saldo > 0)
    .sort((a, b) =>
      (a.puntosMasAntiguos ?? "").localeCompare(b.puntosMasAntiguos ?? "")
    );

  const saldoGlobal = registrosRed.reduce(
    (total, m) => total + (m.Saldo_Puntos_Disponibles ?? 0),
    0
  );

  console.log(
    `[Zoho] Saldo de red para ${email}: ${saldoGlobal} ` +
      `(raíz ${raizPrincipal.id}, ${registrosRed.length} registros)`
  );

  return {
    // Registro con los puntos más antiguos (destino FIFO por defecto)
    id: redFifo[0]?.id ?? raizPrincipal.ID_Ultima_Hija_Activa ?? semillas[0].id,
    Correo_electr_nico_1:
      semillas[0].Correo_electr_nico_1 ?? raizPrincipal.Correo_electr_nico_1,
    Saldo_Puntos_Disponibles: saldoGlobal,
    Categor_a: raizPrincipal.Categor_a ?? semillas[0].Categor_a,
    Empresa_Membresia:
      raizPrincipal.Empresa_Membresia ?? semillas[0].Empresa_Membresia,
    Membresia_Padre: { name: raizPrincipal.Name ?? "", id: raizPrincipal.id },
    Puntos_Membresia: puntosConsolidados,
    redFifo,
  };
}

/**
 * Trae un registro completo del módulo Redenciones por ID.
 * A diferencia de /search, el GET individual sí incluye subformularios
 * (p. ej. "Bitácora de redención").
 * Devuelve el objeto crudo tal como lo entrega Zoho, para permitir
 * inspección de nombres API de subforms cuando no se conocen.
 */
export async function getRedemptionById(
  id: string
): Promise<Record<string, unknown> | null> {
  const token = await getZohoAccessToken();

  const response = await fetch(
    `${ZOHO_CRM_DOMAIN}/crm/v6/Redenciones/${id}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );

  if (response.status === 204 || response.status === 404) return null;

  if (!response.ok) {
    const error = await response.text();
    console.error("[Zoho] Error trayendo redención:", response.status, error);
    throw new Error(`Zoho get redemption error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as {
    data: Array<Record<string, unknown>>;
  };
  return result.data?.[0] ?? null;
}

export interface ZohoCreateRedemptionResponse {
  data: Array<{
    code: string;
    status: string;
    message: string;
    details: { id: string; Created_Time?: string };
  }>;
}

/**
 * Crea un registro en el módulo Redenciones de Zoho.
 * Devuelve el ID del nuevo registro (a guardar en Sanity).
 */
export async function createRedemptionInZoho(
  membershipId: string,
  points: number
): Promise<{ id: string; createdTime?: string }> {
  const token = await getZohoAccessToken();

  const response = await fetch(`${ZOHO_CRM_DOMAIN}/crm/v6/Redenciones`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          Redencion_Membresia: membershipId,
          Puntos_a_Redimir: points,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Zoho] Error creando redención:", response.status, error);
    throw new Error(`Zoho create redemption error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as ZohoCreateRedemptionResponse;
  const record = result.data?.[0];
  if (!record || record.status !== "success") {
    throw new Error(`Zoho redemption failed: ${JSON.stringify(record)}`);
  }

  console.log(
    `[Zoho] Redención creada: id=${record.details.id}, puntos=${points}, membresía=${membershipId}`
  );
  return { id: record.details.id, createdTime: record.details.Created_Time };
}

/**
 * Busca un contacto en Zoho CRM por email.
 * Retorna el contacto si existe, null si no.
 */
export async function searchContactByEmail(
  email: string
): Promise<ZohoContact | null> {
  const token = await getZohoAccessToken();

  const fields = [
    "Full_Name",
    "First_Name",
    "Last_Name",
    "Email",
    "Estado",
    "Estado_Fidelizaci_n",
    "Phone",
    "Mobile",
    "Cargo",
    "Account_Name",
    "Ciudad_Principal",
    "Date_of_Birth",
  ].join(",");
  const url =
    `${ZOHO_CRM_DOMAIN}/crm/v6/Contacts/search` +
    `?email=${encodeURIComponent(email)}&fields=${fields}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
    },
  });

  if (response.status === 204) {
    console.log(`[Zoho] Contacto NO encontrado para: ${email}`);
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    console.error("[Zoho] Error en búsqueda CRM:", response.status, error);
    throw new Error(`Zoho CRM search error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as ZohoSearchResponse;
  const contact = result.data?.[0] ?? null;
  if (contact) {
    console.log(`[Zoho] Contacto SÍ existe: ${email} (ID: ${contact.id})`);
  }
  return contact;
}
