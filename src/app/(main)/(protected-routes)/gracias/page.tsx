import type { Metadata } from "next";
import GraciasView from "@/views/GraciasView";
import { sanityFetch } from "@/sanity/fetch";
import { graciasPageQuery } from "@/sanity/queries";
import { buildMetadata } from "@/sanity/seo";
import type { GraciasPage } from "@/sanity/types";

export async function generateMetadata(): Promise<Metadata> {
  const page = await sanityFetch<GraciasPage | null>(
    graciasPageQuery,
    {},
    ["graciasPage"],
  );
  return buildMetadata({
    seo: page?.seo,
    title: page?.title ?? "¡Gracias!",
    path: "/gracias",
    noindex: true,
  });
}

export default async function GraciasPageRoute() {
  const page = await sanityFetch<GraciasPage | null>(
    graciasPageQuery,
    {},
    ["graciasPage"],
  );
  return <GraciasView page={page} />;
}
