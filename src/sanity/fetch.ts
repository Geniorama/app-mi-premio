import { sanityClient } from "./client";

const IS_DEV = process.env.NODE_ENV === "development";
const REVALIDATE_SECONDS = 60;

export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  tags: string[] = [],
): Promise<T> {
  return sanityClient.fetch<T>(query, params, {
    cache: IS_DEV ? "no-store" : "force-cache",
    next: IS_DEV ? undefined : { revalidate: REVALIDATE_SECONDS, tags },
  });
}
