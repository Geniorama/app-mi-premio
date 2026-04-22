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
  /** Campo "Correo electrónico 1" del registro de membresía */
  Correo_electr_nico_1?: string;
  Saldo_Puntos_Disponibles?: number;
  /** Ajustar al nombre API real del campo de categoría */
  Categor_a?: string;
  /** Subformulario Puntos Membresía */
  Puntos_Membresia?: ZohoPuntoMembresia[];
}

interface ZohoListResponse<T> {
  data: T[];
  info: { count: number; more_records: boolean };
}

/**
 * Busca la membresía de un contacto por email y luego trae el registro
 * completo por ID para incluir el subformulario Puntos_Membresia.
 */
export async function getMembershipByEmail(
  email: string
): Promise<ZohoMembership | null> {
  const token = await getZohoAccessToken();

  // Paso 1: buscar por email para obtener el ID
  const criteria = `(Correo_electr_nico_1:equals:${email})`;
  const searchUrl =
    `${ZOHO_CRM_DOMAIN}/crm/v6/Membresias/search` +
    `?criteria=${encodeURIComponent(criteria)}`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (searchRes.status === 204) {
    console.log(`[Zoho] Membresía NO encontrada para: ${email}`);
    return null;
  }

  if (!searchRes.ok) {
    const error = await searchRes.text();
    console.error("[Zoho] Error buscando membresía:", searchRes.status, error);
    throw new Error(`Zoho CRM membership error: ${searchRes.status} - ${error}`);
  }

  const searchResult = (await searchRes.json()) as ZohoListResponse<ZohoMembership>;
  const partial = searchResult.data?.[0] ?? null;
  if (!partial) return null;

  console.log(`[Zoho] Membresía encontrada para: ${email} (ID: ${partial.id})`);

  // Paso 2: traer el registro completo por ID para obtener subformularios
  const recordUrl = `${ZOHO_CRM_DOMAIN}/crm/v6/Membresias/${partial.id}`;
  const recordRes = await fetch(recordUrl, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (!recordRes.ok) {
    console.warn(`[Zoho] No se pudo traer registro completo, usando resultado parcial`);
    return partial;
  }

  const recordResult = (await recordRes.json()) as ZohoListResponse<ZohoMembership>;
  return recordResult.data?.[0] ?? partial;
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
