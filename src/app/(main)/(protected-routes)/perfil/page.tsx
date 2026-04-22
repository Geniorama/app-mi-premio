import PerfilAfiliadoView from "@/views/PerfilAfiliadoView";
import { sanityFetch } from "@/sanity/fetch";
import { vouchersFeaturedQuery } from "@/sanity/queries";
import type { VoucherCard } from "@/sanity/types";

export default async function PerfilAfiliado() {
  const vouchers = await sanityFetch<VoucherCard[]>(
    vouchersFeaturedQuery,
    {},
    ["voucher"]
  );
  return <PerfilAfiliadoView vouchers={vouchers ?? []} />;
}
