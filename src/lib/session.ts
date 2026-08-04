/**
 * Sesión firmada con HMAC-SHA256.
 *
 * Formato del token: `<payload base64url>.<firma base64url>`
 * La firma impide que el cliente forje una sesión con otro correo o con
 * ámbito de administrador (el payload sigue siendo legible, así que nunca
 * debe contener secretos).
 *
 * Usa Web Crypto (no `node:crypto`) porque `middleware.ts` corre en el
 * runtime Edge. Por eso todas las funciones son asíncronas.
 */

const SESSION_COOKIE = "mi-premio-session";
const ADMIN_SESSION_COOKIE = "mi-premio-admin-session";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 días
/** El panel administrativo expira mucho antes que la sesión de afiliado */
const ADMIN_SESSION_MAX_AGE = 12 * 60 * 60; // 12 horas

/** Ámbito del token: un token de afiliado no sirve para el panel admin */
type SessionScope = "user" | "admin";

export interface SessionUser {
  email: string;
  fullName: string;
  contactId: string;
}

export interface AdminSessionUser {
  email: string;
  fullName: string;
  /** _id del documento adminUser en Sanity */
  adminId: string;
  role: string;
}

interface SignedPayload {
  scope: SessionScope;
  exp: number;
  [key: string]: unknown;
}

/**
 * Secreto de firma. `SESSION_SECRET` es la variable propia; se admite
 * `CRON_SECRET` como respaldo para no romper despliegues existentes que
 * aún no la definen.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    throw new Error(
      "Falta SESSION_SECRET (o CRON_SECRET) para firmar la sesión."
    );
  }
  return secret;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function getKey(secret: string): Promise<CryptoKey> {
  const cached = keyCache.get(secret);
  if (cached) return cached;

  const key = crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  keyCache.set(secret, key);
  return key;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);

  // Se respalda en un ArrayBuffer propio: `crypto.subtle` no acepta vistas
  // sobre un SharedArrayBuffer, que es lo que infiere `Uint8Array.from`.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodePayload(payload: SignedPayload): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

function decodePayload(encoded: string): SignedPayload | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded)));
  } catch {
    return null;
  }
}

async function sign(payload: SignedPayload): Promise<string> {
  const encoded = encodePayload(payload);
  const key = await getKey(getSecret());
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded)
  );
  return `${encoded}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verifica firma, vigencia y ámbito. Devuelve el payload o null.
 * Cualquier fallo (token malformado, firma inválida, expirado, ámbito
 * distinto) devuelve null sin distinguir la causa.
 */
async function verify(
  token: string | undefined,
  scope: SessionScope
): Promise<SignedPayload | null> {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;

  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  try {
    const key = await getKey(getSecret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(encoded)
    );
    if (!valid) return null;
  } catch {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload) return null;
  if (payload.scope !== scope) return null;
  if (!payload.exp || Date.now() > payload.exp) return null;

  return payload;
}

// ---------------------------------------------------------------- afiliados

export function createSessionToken(user: SessionUser): Promise<string> {
  return sign({
    scope: "user",
    email: user.email,
    fullName: user.fullName,
    contactId: user.contactId,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionUser | null> {
  const payload = await verify(token, "user");
  if (!payload) return null;

  const email = typeof payload.email === "string" ? payload.email : "";
  if (!email) return null;

  return {
    email,
    fullName:
      typeof payload.fullName === "string" && payload.fullName
        ? payload.fullName
        : email,
    contactId: typeof payload.contactId === "string" ? payload.contactId : "",
  };
}

// -------------------------------------------------------------- admin panel

export function createAdminSessionToken(
  admin: AdminSessionUser
): Promise<string> {
  return sign({
    scope: "admin",
    email: admin.email,
    fullName: admin.fullName,
    adminId: admin.adminId,
    role: admin.role,
    exp: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
  });
}

export async function verifyAdminSessionToken(
  token: string | undefined
): Promise<AdminSessionUser | null> {
  const payload = await verify(token, "admin");
  if (!payload) return null;

  const email = typeof payload.email === "string" ? payload.email : "";
  if (!email) return null;

  return {
    email,
    fullName:
      typeof payload.fullName === "string" && payload.fullName
        ? payload.fullName
        : email,
    adminId: typeof payload.adminId === "string" ? payload.adminId : "",
    role: typeof payload.role === "string" ? payload.role : "viewer",
  };
}

/** Opciones compartidas de la cookie de sesión */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
};
