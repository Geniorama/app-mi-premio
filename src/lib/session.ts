/**
 * Sesión de usuario - cookie con datos básicos.
 * Para producción considera JWT firmado o sesiones en DB.
 */

const SESSION_COOKIE = "mi-premio-session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 días

export interface SessionUser {
  email: string;
  fullName: string;
  contactId: string;
}

export function setSessionCookie(user: SessionUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
  return Buffer.from(payload, "utf-8").toString("base64url");
}

export function parseSessionCookie(value: string): SessionUser | null {
  try {
    const payload = JSON.parse(
      Buffer.from(value, "base64url").toString("utf-8")
    );
    if (payload.exp && Date.now() > payload.exp) return null;
    return {
      email: payload.email,
      fullName: payload.fullName || payload.email,
      contactId: payload.contactId,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
