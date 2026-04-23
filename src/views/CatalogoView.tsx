"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import OfferCard from "@/components/OfferCard";
import Button from "@/utils/Button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { urlFor } from "@/sanity/image";
import type { CatalogoPage, VoucherCard } from "@/sanity/types";

interface CatalogoViewProps {
  page: CatalogoPage | null;
  vouchers: VoucherCard[];
}

const PLACEHOLDER = "https://placehold.co/800x300/E85D04/white?text=VOUCHER";
const PAGE_SIZE = 4;

export default function CatalogoView({ page, vouchers }: CatalogoViewProps) {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = vouchers.slice(0, visibleCount);
  const hasMore = visibleCount < vouchers.length;

  const heroImage = page?.hero?.image ? urlFor(page.hero.image).width(600).url() : undefined;
  const heroBg = page?.hero?.backgroundImage
    ? urlFor(page.hero.backgroundImage).width(1920).url()
    : undefined;

  return (
    <div>
      <Hero
        title={page?.hero?.title}
        subtitle={page?.hero?.subtitle}
        description={page?.hero?.description}
        buttonText={page?.hero?.buttonText}
        image={heroImage}
        backgroundImage={heroBg}
      />

      <section className="w-full bg-white p-12 lg:py-24">
        <Container>
          <div className="space-y-16">
            {vouchers.length === 0 ? (
              <p className="text-center text-gray-400">No hay vouchers disponibles.</p>
            ) : (
              visible.map((v) => (
                <OfferCard
                  key={v._id}
                  id={v.slug}
                  image={v.image ? urlFor(v.image).width(1600).url() : PLACEHOLDER}
                  title={v.title}
                  handleClick={() => router.push(`/catalogo/${v.slug}`)}
                />
              ))
            )}

            {hasMore && (
              <Button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full mx-auto mt-4"
                variant="secondary"
              >
                {page?.loadMoreLabel ?? "Ver más"}
              </Button>
            )}
          </div>
        </Container>
      </section>
    </div>
  );
}
