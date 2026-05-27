import type { Metadata } from "next";
import CatalogoView from "@/views/CatalogoView";
import { sanityFetch } from "@/sanity/fetch";
import { catalogoPageQuery, vouchersListQuery } from "@/sanity/queries";
import { buildMetadata, getSeoDefaults } from "@/sanity/seo";
import type { CatalogoPage, VoucherCard } from "@/sanity/types";

export async function generateMetadata(): Promise<Metadata> {
  const [page, { defaultSeo }] = await Promise.all([
    sanityFetch<CatalogoPage | null>(catalogoPageQuery, {}, ["catalogoPage"]),
    getSeoDefaults(),
  ]);
  return buildMetadata({
    seo: page?.seo,
    defaults: defaultSeo,
    title: "Catálogo de premios",
    path: "/catalogo",
  });
}

export default async function CatalogoPage() {
  const [page, vouchers] = await Promise.all([
    sanityFetch<CatalogoPage | null>(catalogoPageQuery, {}, ["catalogoPage"]),
    sanityFetch<VoucherCard[]>(vouchersListQuery, {}, ["voucher"]),
  ]);

  return <CatalogoView page={page} vouchers={vouchers ?? []} />;
}
