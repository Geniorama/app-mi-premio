import { redirect } from "next/navigation";

/** El panel abre en el único módulo disponible por ahora. */
export default function AdminIndexPage() {
  redirect("/admin/informes");
}
