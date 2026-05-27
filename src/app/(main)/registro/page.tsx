import type { Metadata } from "next";
import RegistroView from "@/views/RegistroView";
import { sanityFetch } from "@/sanity/fetch";
import { registroPageQuery } from "@/sanity/queries";
import { buildMetadata, getSeoDefaults } from "@/sanity/seo";
import type { RegistroPage } from "@/sanity/types";

export async function generateMetadata(): Promise<Metadata> {
  const [page, { defaultSeo }] = await Promise.all([
    sanityFetch<RegistroPage | null>(registroPageQuery, {}, ["registroPage"]),
    getSeoDefaults(),
  ]);
  return buildMetadata({
    seo: page?.seo,
    defaults: defaultSeo,
    title: "Registro fidelización",
    description: "Formulario de registro al programa de fidelización.",
    path: "/registro",
  });
}

export default async function RegistroPage() {
  const page = await sanityFetch<RegistroPage | null>(
    registroPageQuery,
    {},
    ["registroPage"],
  );
  return <RegistroView page={page} />;
}
