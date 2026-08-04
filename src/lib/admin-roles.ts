/**
 * Roles del panel administrativo.
 *
 * Módulo **sin dependencias de servidor** a propósito: lo importan tanto los
 * route handlers como los Client Components. Meterlo en `lib/admin.ts`
 * arrastraría `next/headers` y el cliente de Sanity al bundle del navegador.
 */

export const ADMIN_ROLES = [
  {
    value: "owner",
    label: "Propietario",
    description: "Control total, incluida la gestión de administradores.",
  },
  {
    value: "admin",
    label: "Administrador",
    description: "Ve los informes y gestiona administradores, salvo propietarios.",
  },
  {
    value: "viewer",
    label: "Consulta",
    description: "Solo lectura de informes.",
  },
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number]["value"];

export const DEFAULT_ADMIN_ROLE: AdminRole = "viewer";

/** Menor índice = más privilegio. */
const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, viewer: 2 };

export function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.some((role) => role.value === value);
}

export function roleLabel(role: string): string {
  return ADMIN_ROLES.find((item) => item.value === role)?.label ?? role;
}

export function roleRank(role: string): number {
  return ROLE_RANK[role] ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Quién puede administrar administradores.
 *
 * Deja fuera a `viewer`: sin esto, una cuenta de solo lectura podría crearse
 * un propietario y escalar privilegios.
 */
export function canManageAdmins(role: string): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Nadie puede otorgar un rol por encima del suyo: un `admin` no crea
 * propietarios. Evita que la gestión de usuarios sirva para escalar.
 */
export function canAssignRole(actorRole: string, targetRole: string): boolean {
  return canManageAdmins(actorRole) && roleRank(targetRole) >= roleRank(actorRole);
}

/** Roles que una persona con `actorRole` puede asignar. */
export function assignableRoles(actorRole: string) {
  return ADMIN_ROLES.filter((role) => canAssignRole(actorRole, role.value));
}
