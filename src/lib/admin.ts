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
import {
  canManageAdmins,
  roleRank,
  DEFAULT_ADMIN_ROLE,
} from "@/lib/admin-roles";

export interface AdminUser {
  _id: string;
  email: string;
  name?: string;
  role?: string;
  active?: boolean;
}

// Los roles y sus reglas viven en `lib/admin-roles.ts`, sin dependencias de
// servidor, para poder compartirlos con los Client Components.

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
        roleRank(b.role ?? DEFAULT_ADMIN_ROLE) -
        roleRank(a.role ?? DEFAULT_ADMIN_ROLE)
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
 *
 * Devuelve los datos **frescos de Sanity**, no la instantánea que guardó el
 * token al iniciar sesión. El correo es lo único que aporta la cookie (es la
 * identidad firmada); nombre y rol se releen, de modo que cambiarlos en el
 * Studio se refleja en el panel sin esperar a que la persona vuelva a entrar.
 */
export async function requireActiveAdmin(): Promise<AdminSessionUser | null> {
  const session = await getAdminSession();
  if (!session) return null;

  const admin = await getAdminByEmail(session.email);
  if (!admin || admin.active === false) return null;

  return {
    email: admin.email.toLowerCase().trim(),
    fullName: admin.name || admin.email,
    adminId: admin._id,
    role: admin.role || DEFAULT_ADMIN_ROLE,
  };
}

/**
 * Como `requireActiveAdmin`, pero además exige permiso para gestionar
 * administradores. Puerta de entrada del módulo de usuarios.
 */
export async function requireAdminManager(): Promise<AdminSessionUser | null> {
  const admin = await requireActiveAdmin();
  if (!admin || !canManageAdmins(admin.role)) return null;
  return admin;
}
