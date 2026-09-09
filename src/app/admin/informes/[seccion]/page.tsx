import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  INFORME_SECTIONS,
  findInformeSection,
} from "@/views/admin/informes/sections";
import InformesShell from "@/views/admin/informes/InformesShell";
import ResumenSection from "@/views/admin/informes/resumen";
import RedencionesSection from "@/views/admin/informes/redenciones";
import PuntosSection from "@/views/admin/informes/puntos";
import AfiliadosSection from "@/views/admin/informes/afiliados";
import HotelesSection from "@/views/admin/informes/hoteles";
import PorVencerSection from "@/views/admin/informes/por-vencer";

/** El slug de la URL decide qué sección se monta. */
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  resumen: ResumenSection,
  redenciones: RedencionesSection,
  puntos: PuntosSection,
  afiliados: AfiliadosSection,
  hoteles: HotelesSection,
  "por-vencer": PorVencerSection,
};

type Params = { params: Promise<{ seccion: string }> };

/** Prerenderiza los slugs conocidos; cualquier otro cae en notFound(). */
export function generateStaticParams() {
  return INFORME_SECTIONS.map((section) => ({ seccion: section.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { seccion } = await params;
  const section = findInformeSection(seccion);

  return {
    title: section ? `${section.title} · Informes` : "Informes",
    robots: { index: false, follow: false },
  };
}

export default async function InformeSectionPage({ params }: Params) {
  const { seccion } = await params;
  const section = findInformeSection(seccion);
  const Section = SECTION_COMPONENTS[seccion];

  if (!section || !Section) notFound();

  return (
    <InformesShell section={section}>
      <Section />
    </InformesShell>
  );
}
