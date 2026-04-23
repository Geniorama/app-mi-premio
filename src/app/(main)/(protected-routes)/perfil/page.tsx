import PerfilAfiliadoView from "@/views/PerfilAfiliadoView";
import { sanityFetch } from "@/sanity/fetch";
import { perfilPageQuery, vouchersFeaturedQuery } from "@/sanity/queries";
import type { PerfilPage, VoucherCard } from "@/sanity/types";

export default async function PerfilAfiliado() {
  const [vouchers, page] = await Promise.all([
    sanityFetch<VoucherCard[]>(vouchersFeaturedQuery, {}, ["voucher"]),
    sanityFetch<PerfilPage | null>(perfilPageQuery, {}, ["perfilPage"]),
  ]);
  return <PerfilAfiliadoView vouchers={vouchers ?? []} page={page} />;
}
