import AdminLoginView from "@/views/admin/AdminLoginView";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Solo se admite una ruta interna del propio panel como destino
  const safeNext = next?.startsWith("/admin/") ? next : undefined;

  return <AdminLoginView next={safeNext} />;
}
