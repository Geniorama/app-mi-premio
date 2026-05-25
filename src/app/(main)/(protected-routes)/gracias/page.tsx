import GraciasView from "@/views/GraciasView";
import { sanityFetch } from "@/sanity/fetch";
import { graciasPageQuery } from "@/sanity/queries";
import type { GraciasPage } from "@/sanity/types";

export default async function GraciasPageRoute() {
  const page = await sanityFetch<GraciasPage | null>(
    graciasPageQuery,
    {},
    ["graciasPage"],
  );
  return <GraciasView page={page} />;
}
