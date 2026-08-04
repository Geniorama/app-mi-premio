/**
 * Control de acceso del panel administrativo.
 *
 * Los administradores NO son afiliados del CRM: viven en documentos
 * `adminUser` de Sanity, así que el equipo puede darlos de alta o de baja
 * desde el Studio sin desplegar. Solo cuenta el documento publicado y con
 * `active == true`.
 */

import { cookies } from "next/headers";
import { sanityFreshClient } from "@/sanity/client";
import { adminUsersByEmailQuery } from "@/sanity/queries";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
  type AdminSessionUser,
} from "@/lib/session";

export interface AdminUser {
  _id: string;
  email: string;
  name?: string;
  role?: string;
  active?: boolean;
}

/** Roles soportados, de mayor a menor privilegio. */
export const ADMIN_ROLES = ["owner", "admin", "viewer"] as const;

/** Índice de privilegio: cuanto mayor, menos permisos. */
const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, viewer: 2 };

/**
 * Busca un administrador activo por correo. Devuelve null si no existe,
 * está inactivo o solo existe como borrador.
 *
 * Si hubiera varios documentos con el mismo correo (mala configuración en el
 * Studio), gana el de **menor privilegio**: ante una ambigüedad conviene
 * conceder de menos, no de más.
 */
export async function getAdminByEmail(
  email: string
): Promise<AdminUser | null> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return null;

  try {
    const matches = await sanityFreshClient.fetch<AdminUser[]>(
      adminUsersByEmailQuery,
      { email: normalized }
    );

    if (!matches?.length) return null;

    if (matches.length > 1) {
      console.warn(
        `[admin] ${matches.length} documentos adminUser con el correo ${normalized}:`,
        matches.map((match) => match._id).join(", ")
      );
    }

    return [...matches].sort(
      (a, b) =>
        (ROLE_RANK[b.role ?? "viewer"] ?? 99) -
        (ROLE_RANK[a.role ?? "viewer"] ?? 99)
    )[0];
  } catch (error) {
    // Un fallo de Sanity no debe interpretarse como "es admin".
    console.error("[admin] Error consultando adminUser:", error);
    return null;
  }
}

/**
 * Lee la sesión administrativa de las cookies. No revalida contra Sanity:
 * la revalidación se hace al emitir el token y, para operaciones sensibles,
 * con `requireActiveAdmin`.
 */
export async function getAdminSession(): Promise<AdminSessionUser | null> {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/**
 * Sesión válida + administrador todavía activo en Sanity.
 * Úsalo en los route handlers del panel: revocar un admin en el Studio
 * corta el acceso sin esperar a que expire su cookie.
 */
export async function requireActiveAdmin(): Promise<AdminSessionUser | null> {
  const session = await getAdminSession();
  if (!session) return null;

  const admin = await getAdminByEmail(session.email);
  if (!admin || admin.active === false) return null;

  return session;
}
