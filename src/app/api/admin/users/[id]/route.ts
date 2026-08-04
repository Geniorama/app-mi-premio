import { NextResponse } from "next/server";
import { requireAdminManager } from "@/lib/admin";
import {
  canAssignRole,
  isAdminRole,
  roleRank,
  DEFAULT_ADMIN_ROLE,
} from "@/lib/admin-roles";
import { sanityFreshClient } from "@/sanity/client";
import { sanityWriteClient, assertWriteClient } from "@/sanity/writeClient";

export const dynamic = "force-dynamic";

interface AdminUserDoc {
  _id: string;
  email: string;
  name?: string;
  role?: string;
  active?: boolean;
}

/**
 * PATCH /api/admin/users/[id] — cambia el rol o el estado de un administrador.
 *
 * No hay borrado: desactivar revoca el acceso igual de rápido, es reversible
 * y conserva el rastro de quién tuvo acceso. Para eliminar de verdad está el
 * Studio.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const manager = await requireAdminManager();
  if (!manager) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    assertWriteClient();
  } catch {
    return NextResponse.json(
      { error: "Falta SANITY_API_WRITE_TOKEN en el servidor" },
      { status: 500 }
    );
  }

  const { id } = await params;

  try {
    const target = await sanityFreshClient.fetch<AdminUserDoc | null>(
      `*[_type == "adminUser" && _id == $id][0]{_id, email, name, role, active}`,
      { id }
    );

    if (!target) {
      return NextResponse.json(
        { error: "No se encontró ese administrador" },
        { status: 404 }
      );
    }

    // Cambiar la propia cuenta puede dejarte fuera del panel (o servir para
    // ascenderte). Se hace desde el Studio o por otro propietario.
    if (target._id === manager.adminId) {
      return NextResponse.json(
        { error: "No puedes cambiar tu propia cuenta desde aquí" },
        { status: 400 }
      );
    }

    const targetRole = target.role ?? DEFAULT_ADMIN_ROLE;

    // Nadie toca a quien tiene más privilegio: un admin no desactiva a un
    // propietario.
    if (roleRank(targetRole) < roleRank(manager.role)) {
      return NextResponse.json(
        { error: "No puedes modificar una cuenta con más privilegios que la tuya" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const patch: Record<string, unknown> = {};

    if (body?.role !== undefined) {
      const role = String(body.role);
      if (!isAdminRole(role)) {
        return NextResponse.json({ error: "Rol desconocido" }, { status: 400 });
      }
      if (!canAssignRole(manager.role, role)) {
        return NextResponse.json(
          { error: "No puedes asignar un rol superior al tuyo" },
          { status: 403 }
        );
      }
      patch.role = role;
    }

    if (body?.active !== undefined) {
      patch.active = Boolean(body.active);
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    // Nunca dejar el panel sin ningún propietario activo: sería irreversible
    // desde la propia aplicación.
    const pierdeOwner =
      targetRole === "owner" &&
      target.active !== false &&
      (patch.active === false || (patch.role !== undefined && patch.role !== "owner"));

    if (pierdeOwner) {
      const ownersActivos = await sanityFreshClient.fetch<number>(
        `count(*[_type == "adminUser" && role == "owner" && active == true])`
      );
      if (ownersActivos <= 1) {
        return NextResponse.json(
          {
            error:
              "Es el único propietario activo. Asigna otro propietario antes de cambiarlo.",
          },
          { status: 409 }
        );
      }
    }

    const updated = await sanityWriteClient.patch(id).set(patch).commit();

    console.log(
      `[admin/users] ${manager.email} actualizó a ${target.email}:`,
      JSON.stringify(patch)
    );

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("[admin/users] PATCH:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el administrador" },
      { status: 502 }
    );
  }
}
