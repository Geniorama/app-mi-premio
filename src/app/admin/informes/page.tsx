import { redirect } from "next/navigation";
import { requireActiveAdmin } from "@/lib/admin";
import AdminShell from "@/views/admin/AdminShell";
import AdminInformesView from "@/views/admin/AdminInformesView";

export const dynamic = "force-dynamic";

export default async function AdminInformesPage() {
  // El middleware solo puede validar la firma de la cookie (corre en Edge y
  // no consulta Sanity). Aquí se revalida que el administrador siga activo,
  // para que revocar a alguien en el Studio le cierre el panel de inmediato
  // y no solo sus llamadas al API.
  const admin = await requireActiveAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <AdminShell adminName={admin.fullName} adminEmail={admin.email}>
      <AdminInformesView />
    </AdminShell>
  );
}
