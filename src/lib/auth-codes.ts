/**
 * Almacenamiento temporal de códigos de verificación para login.
 * En producción, considera usar Redis con TTL.
 */

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutos

interface CodeEntry {
  code: string;
  email: string;
  expiresAt: number;
}

/**
 * Ámbito del código. Separa el flujo de afiliados del panel administrativo:
 * un mismo correo puede pedir código en ambos y los códigos no se pisan
 * ni son intercambiables.
 */
export type CodeScope = "user" | "admin";

const storeKey = (email: string, scope: CodeScope) =>
  `${scope}:${email.toLowerCase().trim()}`;

// Persiste entre hot-reloads en desarrollo
const globalForAuthCodes = globalThis as unknown as { codesStore: Map<string, CodeEntry> };
const codesStore = globalForAuthCodes.codesStore ?? new Map<string, CodeEntry>();
if (process.env.NODE_ENV !== "production") globalForAuthCodes.codesStore = codesStore;

/**
 * Genera un código numérico de 6 dígitos.
 */
export function generateLoginCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Guarda un código de login asociado a un email.
 */
export function storeLoginCode(email: string, scope: CodeScope = "user"): string {
  const code = generateLoginCode();
  const normalizedEmail = email.toLowerCase().trim();

  codesStore.set(storeKey(normalizedEmail, scope), {
    code,
    email: normalizedEmail,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
  });
  console.log(`[auth-codes] Código guardado (${scope}) para:`, normalizedEmail);

  return code;
}

/**
 * Verifica si el código coincide para el email dado.
 */
export function verifyLoginCode(
  email: string,
  code: string,
  scope: CodeScope = "user"
): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const key = storeKey(normalizedEmail, scope);
  const entry = codesStore.get(key);

  if (!entry) {
    console.log(`[auth-codes] No hay código (${scope}) para:`, normalizedEmail);
    return false;
  }
  if (Date.now() > entry.expiresAt) {
    codesStore.delete(key);
    console.log("[auth-codes] Código expirado para:", normalizedEmail);
    return false;
  }
  // Nunca registrar el código esperado: el log filtraría la credencial.
  const valid = entry.code === code.trim();
  if (!valid) {
    console.log("[auth-codes] Código incorrecto para:", normalizedEmail);
  }
  if (valid) codesStore.delete(key);
  return valid;
}
