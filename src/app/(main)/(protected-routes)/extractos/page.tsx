import type { Metadata } from "next";
import ExtractosView from "@/views/ExtractosView";
import { sanityFetch } from "@/sanity/fetch";
import { extractosPageQuery } from "@/sanity/queries";
import { buildMetadata } from "@/sanity/seo";
import type { ExtractosPage } from "@/sanity/types";

export async function generateMetadata(): Promise<Metadata> {
  const page = await sanityFetch<ExtractosPage | null>(
    extractosPageQuery,
    {},
    ["extractosPage"],
  );
  return buildMetadata({
    seo: page?.seo,
    title: "Mis extractos",
    path: "/extractos",
    noindex: true,
  });
}

export default async function ExtractosPageRoute() {
  const page = await sanityFetch<ExtractosPage | null>(
    extractosPageQuery,
    {},
    ["extractosPage"],
  );
  return <ExtractosView page={page} />;
}
