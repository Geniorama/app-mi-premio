import CatalogoView from "@/views/CatalogoView";
import { sanityFetch } from "@/sanity/fetch";
import { catalogoPageQuery, vouchersListQuery } from "@/sanity/queries";
import type { CatalogoPage, VoucherCard } from "@/sanity/types";

export default async function CatalogoPage() {
  const [page, vouchers] = await Promise.all([
    sanityFetch<CatalogoPage | null>(catalogoPageQuery, {}, ["catalogoPage"]),
    sanityFetch<VoucherCard[]>(vouchersListQuery, {}, ["voucher"]),
  ]);

  return <CatalogoView page={page} vouchers={vouchers ?? []} />;
}
