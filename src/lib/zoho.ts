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

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Obtiene un access token válido usando el refresh token.
 * Cachea el token hasta que expire (con 5 min de margen).
 */
export async function getZohoAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && tokenExpiresAt > now + 5 * 60 * 1000) {
    console.log("[Zoho] Usando access token en caché");
    return cachedAccessToken;
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
  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;

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
 * Busca una membresía por un criterio GROQ-like de Zoho y devuelve el primer
 * resultado parcial (o null si Zoho responde 204/sin datos).
 */
async function searchMembershipByCriteria(
  token: string,
  criteria: string
): Promise<ZohoMembership | null> {
  const searchUrl =
    `${ZOHO_CRM_DOMAIN}/crm/v6/Membresias/search` +
    `?criteria=${encodeURIComponent(criteria)}`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (searchRes.status === 204) return null;

  if (!searchRes.ok) {
    const error = await searchRes.text();
    console.error("[Zoho] Error buscando membresía:", searchRes.status, error);
    throw new Error(`Zoho CRM membership error: ${searchRes.status} - ${error}`);
  }

  const searchResult =
    (await searchRes.json()) as ZohoListResponse<ZohoMembership>;
  return searchResult.data?.[0] ?? null;
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

/**
 * Busca la membresía de un contacto por email.
 *
 * En Zoho las membresías con email son registros "Hija" (una por ciclo);
 * el saldo consolidado del afiliado vive en la membresía "Padre"
 * (campo Puntos_Globales_Red = padre + todas las hijas).
 *
 * Devuelve una membresía con:
 * - Saldo_Puntos_Disponibles = saldo global de la red (del Padre)
 * - Puntos_Membresia = historial agregado (Padre + todas las Hijas)
 * - id = última hija activa (para asociar redenciones)
 */
export async function getMembershipByEmail(
  email: string
): Promise<ZohoMembership | null> {
  const token = await getZohoAccessToken();

  // Paso 1: buscar por email para obtener una membresía hija.
  // El email suele vivir en "Correo electrónico 1" (Correo_electr_nico_1),
  // pero algunos afiliados solo lo tienen en el "Nombre de Membresía" (Name)
  // —típicamente registros Padre—, así que se hace fallback a buscar por Name.
  let partial = await searchMembershipByCriteria(
    token,
    `(Correo_electr_nico_1:equals:${email})`
  );
  if (!partial) {
    partial = await searchMembershipByCriteria(
      token,
      `(Name:equals:${email})`
    );
    if (partial) {
      console.log(`[Zoho] Membresía encontrada por Name para: ${email}`);
    }
  }
  if (!partial) {
    console.log(`[Zoho] Membresía NO encontrada para: ${email}`);
    return null;
  }

  console.log(`[Zoho] Membresía encontrada para: ${email} (ID: ${partial.id})`);

  // Paso 2: traer el registro completo por ID (incluye subform y lookup al Padre)
  const child = (await getMembershipRecordById(token, partial.id)) ?? partial;

  const parentId = child.Membresia_Padre?.id;
  if (!parentId) {
    // Registro sin Padre (membresía única): comportamiento original
    return child;
  }

  // Paso 3: traer el Padre — tiene el saldo global y la lista de hijas
  const parent = await getMembershipRecordById(token, parentId);
  if (!parent) {
    console.warn(`[Zoho] No se pudo traer membresía Padre ${parentId}, usando hija`);
    return child;
  }

  // Paso 4: traer las demás hijas para consolidar el historial de puntos
  const siblingIds = (parent.Membresias_Hijas_Relacionadas ?? [])
    .map((h) => h.Membresia_Hija_Lookup?.id)
    .filter((id): id is string => Boolean(id) && id !== child.id);

  const siblings = (
    await Promise.all(siblingIds.map((id) => getMembershipRecordById(token, id)))
  ).filter((m): m is ZohoMembership => m !== null);

  const registrosRed = [parent, child, ...siblings];

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

  const saldoGlobal =
    parent.Puntos_Globales_Red ?? parent.Saldo_Puntos_Disponibles;

  console.log(
    `[Zoho] Saldo global de red para ${email}: ${saldoGlobal} (Padre ${parent.id})`
  );

  return {
    // Registro con los puntos más antiguos (destino FIFO por defecto)
    id: redFifo[0]?.id ?? parent.ID_Ultima_Hija_Activa ?? child.id,
    Correo_electr_nico_1: child.Correo_electr_nico_1,
    Saldo_Puntos_Disponibles: saldoGlobal,
    Categor_a: parent.Categor_a ?? child.Categor_a,
    Membresia_Padre: { name: parent.Name ?? "", id: parent.id },
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
