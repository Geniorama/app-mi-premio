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

export interface ZohoMembership {
  id: string;
  /** Campo "Correo electrónico 1" del registro de membresía */
  Correo_electr_nico_1?: string;
  Saldo_Puntos_Disponibles?: number;
  /** Ajustar al nombre API real del campo de categoría */
  Categor_a?: string;
}

interface ZohoListResponse<T> {
  data: T[];
  info: { count: number; more_records: boolean };
}

/**
 * Busca la membresía de un contacto en el módulo CustomModule23
 * usando el campo "Nombre de Membresia" (que contiene el email).
 */
export async function getMembershipByEmail(
  email: string
): Promise<ZohoMembership | null> {
  const token = await getZohoAccessToken();

  const criteria = `(Correo_electr_nico_1:equals:${email})`;
  const url =
    `${ZOHO_CRM_DOMAIN}/crm/v6/Membresias/search` +
    `?criteria=${encodeURIComponent(criteria)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (response.status === 204) {
    console.log(`[Zoho] Membresía NO encontrada para: ${email}`);
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    console.error("[Zoho] Error buscando membresía:", response.status, error);
    throw new Error(`Zoho CRM membership error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as ZohoListResponse<ZohoMembership>;
  const membership = result.data?.[0] ?? null;
  if (membership) {
    console.log(`[Zoho] Membresía encontrada para: ${email} (ID: ${membership.id})`);
  }
  return membership;
}

/**
 * Busca un contacto en Zoho CRM por email.
 * Retorna el contacto si existe, null si no.
 */
export async function searchContactByEmail(
  email: string
): Promise<ZohoContact | null> {
  const token = await getZohoAccessToken();

  const url = `${ZOHO_CRM_DOMAIN}/crm/v6/Contacts/search?email=${encodeURIComponent(email)}`;

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
