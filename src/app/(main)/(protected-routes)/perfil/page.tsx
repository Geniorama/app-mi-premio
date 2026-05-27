import type { Metadata } from "next";
import PerfilAfiliadoView from "@/views/PerfilAfiliadoView";
import { sanityFetch } from "@/sanity/fetch";
import { perfilPageQuery, vouchersFeaturedQuery } from "@/sanity/queries";
import { buildMetadata } from "@/sanity/seo";
import type { PerfilPage, VoucherCard } from "@/sanity/types";

export async function generateMetadata(): Promise<Metadata> {
  const page = await sanityFetch<PerfilPage | null>(
    perfilPageQuery,
    {},
    ["perfilPage"],
  );
  return buildMetadata({
    seo: page?.seo,
    title: "Mi perfil",
    path: "/perfil",
    noindex: true,
  });
}

export default async function PerfilAfiliado() {
  const [vouchers, page] = await Promise.all([
    sanityFetch<VoucherCard[]>(vouchersFeaturedQuery, {}, ["voucher"]),
    sanityFetch<PerfilPage | null>(perfilPageQuery, {}, ["perfilPage"]),
  ]);
  return <PerfilAfiliadoView vouchers={vouchers ?? []} page={page} />;
}
