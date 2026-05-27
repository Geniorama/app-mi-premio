import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VoucherDetailView from "@/views/VoucherDetailView";
import { sanityFetch } from "@/sanity/fetch";
import { voucherBySlugQuery } from "@/sanity/queries";
import { buildMetadata, getSeoDefaults } from "@/sanity/seo";
import type { Voucher } from "@/sanity/types";

interface Params {
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const [voucher, { defaultSeo }] = await Promise.all([
    sanityFetch<Voucher | null>(voucherBySlugQuery, { slug: id }, ["voucher"]),
    getSeoDefaults(),
  ]);

  if (!voucher) {
    return buildMetadata({
      defaults: defaultSeo,
      title: "Premio no encontrado",
      path: `/catalogo/${id}`,
      noindex: true,
    });
  }

  return buildMetadata({
    defaults: defaultSeo,
    title: voucher.title,
    description: voucher.shortDescription,
    image: voucher.image,
    path: `/catalogo/${voucher.slug}`,
  });
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
