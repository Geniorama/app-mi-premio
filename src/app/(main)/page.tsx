import HomeView from "@/views/Home";
import { sanityFetch } from "@/sanity/fetch";
import { homePageQuery } from "@/sanity/queries";
import type { HomePage } from "@/sanity/types";

export default async function Home() {
  const data = await sanityFetch<HomePage | null>(homePageQuery, {}, ["homePage"]);

  return (
    <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
      <HomeView data={data} />
    </div>
  );
}
