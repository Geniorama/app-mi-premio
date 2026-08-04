import { NextResponse } from "next/server";
import { requireAdminManager } from "@/lib/admin";
import { canAssignRole, isAdminRole, DEFAULT_ADMIN_ROLE } from "@/lib/admin-roles";
import { sanityFreshClient } from "@/sanity/client";
import { sanityWriteClient, assertWriteClient } from "@/sanity/writeClient";
import { adminUsersListQuery } from "@/sanity/queries";

export const dynamic = "force-dynamic";

interface AdminUserDoc {
  _id: string;
  email: string;
  name?: string;
  role?: string;
  active?: boolean;
  _createdAt?: string;
  _updatedAt?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ID determinístico derivado del correo. Hace que crear dos veces el mismo
 * administrador choque a nivel de documento en vez de depender solo de la
 * comprobación previa.
 */
function docIdForEmail(email: string): string {
  const slug = email.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `adminUser.${slug}`;
}

/** GET /api/admin/users — listado completo */
export async function GET() {
  const manager = await requireAdminManager();
  if (!manager) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const users = await sanityFreshClient.fetch<AdminUserDoc[]>(adminUsersListQuery);
    return NextResponse.json({ users, actor: manager });
  } catch (error) {
    console.error("[admin/users] GET:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la lista de administradores" },
      { status: 502 }
    );
  }
}

/** POST /api/admin/users — alta de un administrador */
export async function POST(request: Request) {
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

  try {
    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body?.role === "string" ? body.role : DEFAULT_ADMIN_ROLE;

    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "El correo no es válido" }, { status: 400 });
    }
    if (!isAdminRole(role)) {
      return NextResponse.json({ error: "Rol desconocido" }, { status: 400 });
    }
    // Nadie otorga un rol por encima del suyo
    if (!canAssignRole(manager.role, role)) {
      return NextResponse.json(
        { error: "No puedes asignar un rol superior al tuyo" },
        { status: 403 }
      );
    }

    // Un correo duplicado dejaría el acceso ambiguo (getAdminByEmail se
    // quedaría con el de menor privilegio), así que se rechaza.
    const existing = await sanityFreshClient.fetch<AdminUserDoc | null>(
      `*[_type == "adminUser" && lower(email) == $email][0]{_id, name, active}`,
      { email }
    );
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un administrador con ese correo" },
        { status: 409 }
      );
    }

    // `create` con un _id sin prefijo `drafts.` publica directamente: un
    // borrador no daría acceso y confundiría a quien lo crea desde aquí.
    const created = await sanityWriteClient.create({
      _type: "adminUser",
      _id: docIdForEmail(email),
      name,
      email,
      role,
      active: true,
    });

    console.log(
      `[admin/users] ${manager.email} creó a ${email} con rol ${role}`
    );

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    // Choque de _id determinístico: mismo correo creado en paralelo
    if (
      error instanceof Error &&
      /already exists|document with id/i.test(error.message)
    ) {
      return NextResponse.json(
        { error: "Ya existe un administrador con ese correo" },
        { status: 409 }
      );
    }

    console.error("[admin/users] POST:", error);
    return NextResponse.json(
      { error: "No se pudo crear el administrador" },
      { status: 502 }
    );
  }
}
