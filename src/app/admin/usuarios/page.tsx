import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActiveAdmin } from "@/lib/admin";
import { canManageAdmins } from "@/lib/admin-roles";
import AdminShell from "@/views/admin/AdminShell";
import UsuariosView from "@/views/admin/UsuariosView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usuarios",
  robots: { index: false, follow: false },
};

export default async function AdminUsuariosPage() {
  const admin = await requireActiveAdmin();
  if (!admin) redirect("/admin/login");

  // Una cuenta de solo consulta no gestiona administradores: se le devuelve
  // a los informes en vez de mostrarle un módulo que no puede usar.
  if (!canManageAdmins(admin.role)) redirect("/admin/informes");

  return (
    <AdminShell
      adminName={admin.fullName}
      adminEmail={admin.email}
      adminRole={admin.role}
    >
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-xs font-medium uppercase tracking-wide text-[#898781]">
            Administración
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold text-[#0b0b0b]">Usuarios</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#52514e]">
            Quién puede entrar al panel. Los administradores no son afiliados:
            no necesitan existir en Zoho CRM.
          </p>
        </header>

        <UsuariosView actorRole={admin.role} actorId={admin.adminId} />
      </div>
    </AdminShell>
  );
}
