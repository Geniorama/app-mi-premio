import ExtractosView from "@/views/ExtractosView";
import { sanityFetch } from "@/sanity/fetch";
import { extractosPageQuery } from "@/sanity/queries";
import type { ExtractosPage } from "@/sanity/types";

export default async function ExtractosPageRoute() {
  const page = await sanityFetch<ExtractosPage | null>(
    extractosPageQuery,
    {},
    ["extractosPage"],
  );
  return <ExtractosView page={page} />;
}
