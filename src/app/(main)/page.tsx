import type { Metadata } from "next";
import HomeView from "@/views/Home";
import { sanityFetch } from "@/sanity/fetch";
import { homePageQuery } from "@/sanity/queries";
import { buildMetadata, getSeoDefaults } from "@/sanity/seo";
import type { HomePage } from "@/sanity/types";

export async function generateMetadata(): Promise<Metadata> {
  const [page, { siteTitle, defaultSeo }] = await Promise.all([
    sanityFetch<HomePage | null>(homePageQuery, {}, ["homePage"]),
    getSeoDefaults(),
  ]);
  return buildMetadata({
    seo: page?.seo,
    defaults: defaultSeo,
    title: siteTitle,
    path: "/",
    absoluteTitle: true,
  });
}

export default async function Home() {
  const data = await sanityFetch<HomePage | null>(homePageQuery, {}, ["homePage"]);

  return (
    <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
      <HomeView data={data} />
    </div>
  );
}
