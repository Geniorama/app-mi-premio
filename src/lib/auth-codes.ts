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
export function storeLoginCode(email: string): string {
  const code = generateLoginCode();
  const normalizedEmail = email.toLowerCase().trim();

  codesStore.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
  });
  console.log("[auth-codes] Código guardado para:", normalizedEmail);

  return code;
}

/**
 * Verifica si el código coincide para el email dado.
 */
export function verifyLoginCode(email: string, code: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = codesStore.get(normalizedEmail);

  if (!entry) {
    console.log("[auth-codes] No hay código para:", normalizedEmail, "| Store keys:", [...codesStore.keys()]);
    return false;
  }
  if (Date.now() > entry.expiresAt) {
    codesStore.delete(normalizedEmail);
    console.log("[auth-codes] Código expirado para:", normalizedEmail);
    return false;
  }
  const valid = entry.code === code.trim();
  if (!valid) {
    console.log("[auth-codes] Código no coincide. Esperado:", entry.code, "| Recibido:", code);
  }
  if (valid) codesStore.delete(normalizedEmail);
  return valid;
}
