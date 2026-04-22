import { notFound } from "next/navigation";
import VoucherDetailView from "@/views/VoucherDetailView";
import { sanityFetch } from "@/sanity/fetch";
import { voucherBySlugQuery } from "@/sanity/queries";
import type { Voucher } from "@/sanity/types";

interface Params {
  id: string;
}

export default async function VoucherDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const voucher = await sanityFetch<Voucher | null>(
    voucherBySlugQuery,
    { slug: id },
    ["voucher"],
  );

  if (!voucher) notFound();

  return <VoucherDetailView voucher={voucher} />;
}
