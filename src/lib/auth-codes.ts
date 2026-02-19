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

const codesStore = new Map<string, CodeEntry>();

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

  return code;
}

/**
 * Verifica si el código coincide para el email dado.
 */
export function verifyLoginCode(email: string, code: string): boolean {
  const entry = codesStore.get(email.toLowerCase().trim());
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    codesStore.delete(email.toLowerCase().trim());
    return false;
  }
  const valid = entry.code === code;
  if (valid) codesStore.delete(email.toLowerCase().trim());
  return valid;
}
