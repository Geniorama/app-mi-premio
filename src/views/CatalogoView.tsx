"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import OfferCard from "@/components/OfferCard";
import Button from "@/utils/Button";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { urlFor, buildImageSet } from "@/sanity/image";
import type { CatalogoPage, VoucherCard } from "@/sanity/types";

const VOUCHER_WIDTHS = [400, 640, 800, 1024, 1280, 1600];

interface CatalogoViewProps {
  page: CatalogoPage | null;
  vouchers: VoucherCard[];
}

const PLACEHOLDER = "https://placehold.co/800x300/E85D04/white?text=VOUCHER";
const PAGE_SIZE = 4;
// Guarda en sessionStorage cuántos bonos había visibles y la posición de
// scroll al entrar a un bono, para restaurarlos al volver al catálogo.
const RETURN_STATE_KEY = "catalogo:return-state";

export default function CatalogoView({ page, vouchers }: CatalogoViewProps) {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Estado pendiente de restaurar leído desde sessionStorage al montar.
  const pendingReturn = useRef<{ count: number; scrollY: number } | null>(null);

  // Al montar, recupera (y limpia) el estado guardado y reabre los bonos
  // que estaban visibles antes de entrar al detalle.
  useEffect(() => {
    const raw = sessionStorage.getItem(RETURN_STATE_KEY);
    sessionStorage.removeItem(RETURN_STATE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      pendingReturn.current = {
        count: typeof saved.count === "number" ? saved.count : PAGE_SIZE,
        scrollY: typeof saved.scrollY === "number" ? saved.scrollY : 0,
      };
      if (pendingReturn.current.count > PAGE_SIZE) {
        setVisibleCount(pendingReturn.current.count);
      }
    } catch {
      pendingReturn.current = null;
    }
  }, []);

  // Una vez renderizados los bonos que estaban visibles, restaura el scroll.
  useEffect(() => {
    const pending = pendingReturn.current;
    if (!pending) return;
    if (visibleCount >= Math.min(pending.count, vouchers.length || pending.count)) {
      pendingReturn.current = null;
      requestAnimationFrame(() => window.scrollTo(0, pending.scrollY));
    }
  }, [visibleCount, vouchers.length]);

  const goToVoucher = (slug: string) => {
    sessionStorage.setItem(
      RETURN_STATE_KEY,
      JSON.stringify({ count: visibleCount, scrollY: window.scrollY }),
    );
    router.push(`/catalogo/${slug}`);
  };

  const visible = vouchers.slice(0, visibleCount);
  const hasMore = visibleCount < vouchers.length;

  const heroSet = page?.hero?.image
    ? buildImageSet(page.hero.image, [320, 480, 640, 800])
    : null;
  const heroBg = page?.hero?.backgroundImage
    ? urlFor(page.hero.backgroundImage).width(1920).auto("format").url()
    : undefined;

  return (
    <div>
      <Hero
        title={page?.hero?.title}
        subtitle={page?.hero?.subtitle}
        description={page?.hero?.description}
        buttonText={page?.hero?.buttonText}
        image={heroSet?.src}
        imageSrcSet={heroSet?.srcSet}
        backgroundImage={heroBg}
      />

      <section className="w-full bg-white py-8 px-4 sm:py-12 sm:px-6 lg:py-24">
        <Container>
          {vouchers.length > 0 && (
            <p className="text-sm text-gray-500 mb-6 sm:mb-8 lg:mb-10">
              Mostrando {visible.length} de {vouchers.length} bonos
            </p>
          )}
          <div className="space-y-6 sm:space-y-10 lg:space-y-16">
            {vouchers.length === 0 ? (
              <p className="text-center text-gray-400">No hay vouchers disponibles.</p>
            ) : (
              visible.map((v) => {
                const imgSet = v.image ? buildImageSet(v.image, VOUCHER_WIDTHS) : null;
                return (
                  <OfferCard
                    key={v._id}
                    id={v.slug}
                    image={imgSet?.src ?? PLACEHOLDER}
                    imageSrcSet={imgSet?.srcSet}
                    imageSizes="(min-width: 1024px) 1280px, (min-width: 640px) 100vw, 100vw"
                    title={v.title}
                    handleClick={() => goToVoucher(v.slug)}
                  />
                );
              })
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
