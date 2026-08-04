import { redirect } from "next/navigation";
import { requireActiveAdmin } from "@/lib/admin";
import AdminShell from "@/views/admin/AdminShell";

export const dynamic = "force-dynamic";

/**
 * Protege todo el módulo de Informes y monta el marco del panel una sola vez,
 * de modo que navegar entre secciones no vuelva a renderizar la barra lateral.
 *
 * El middleware corre en Edge y solo valida la firma de la cookie; aquí se
 * revalida contra Sanity que el administrador siga activo.
 */
export default async function InformesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireActiveAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <AdminShell
      adminName={admin.fullName}
      adminEmail={admin.email}
      adminRole={admin.role}
    >
      {children}
    </AdminShell>
  );
}
