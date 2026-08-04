import { redirect } from "next/navigation";
import { DEFAULT_SECTION, informeSectionHref } from "@/views/admin/informes/sections";

/** /admin/informes no es una vista propia: abre la primera sección. */
export default function InformesIndexPage() {
  redirect(informeSectionHref(DEFAULT_SECTION.slug));
}
