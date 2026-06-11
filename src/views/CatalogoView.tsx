"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import OfferCard from "@/components/OfferCard";
import Button from "@/utils/Button";
import { useState, useEffect, useRef, useMemo } from "react";
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

// Normaliza texto para búsquedas sin distinguir mayúsculas ni acentos.
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Etiquetas legibles para las categorías definidas en Sanity.
const CATEGORY_LABELS: Record<string, string> = {
  experiencia: "Experiencia",
  producto: "Producto",
  descuento: "Descuento",
};

type SortOption = "recommended" | "points-asc" | "points-desc";

// Tramos de puntos para filtrar bonos según puntos disponibles.
const POINTS_RANGES: { key: string; label: string; test: (p: number) => boolean }[] = [
  { key: "low", label: "Hasta 5.000 pts", test: (p) => p <= 5000 },
  { key: "mid", label: "5.000 – 20.000 pts", test: (p) => p > 5000 && p <= 20000 },
  { key: "high", label: "Más de 20.000 pts", test: (p) => p > 20000 },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-1.5 text-sm transition-colors cursor-pointer ${
        active
          ? "border-custom-green bg-custom-green text-white"
          : "border-gray-300 bg-white text-gray-700 hover:border-custom-green hover:text-custom-green"
      }`}
    >
      {children}
    </button>
  );
}

export default function CatalogoView({ page, vouchers }: CatalogoViewProps) {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [pointsRange, setPointsRange] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("recommended");
  // Estado pendiente de restaurar leído desde sessionStorage al montar.
  const pendingReturn = useRef<{ count: number; scrollY: number } | null>(null);

  // Categorías realmente presentes en el catálogo, en el orden definido arriba.
  const availableCategories = useMemo(() => {
    const present = new Set(
      vouchers.map((v) => v.category).filter((c): c is string => !!c),
    );
    return Object.keys(CATEGORY_LABELS).filter((c) => present.has(c));
  }, [vouchers]);

  // Aplica búsqueda, filtros y orden sobre el listado completo.
  const filtered = useMemo(() => {
    let list = vouchers;

    const q = normalize(search.trim());
    if (q) {
      list = list.filter((v) => normalize(v.title).includes(q));
    }

    if (category) {
      list = list.filter((v) => v.category === category);
    }

    if (pointsRange) {
      const range = POINTS_RANGES.find((r) => r.key === pointsRange);
      if (range) {
        list = list.filter((v) => range.test(v.pointsValue ?? 0));
      }
    }

    if (sort === "points-asc") {
      list = [...list].sort((a, b) => (a.pointsValue ?? 0) - (b.pointsValue ?? 0));
    } else if (sort === "points-desc") {
      list = [...list].sort((a, b) => (b.pointsValue ?? 0) - (a.pointsValue ?? 0));
    }

    return list;
  }, [vouchers, search, category, pointsRange, sort]);

  const hasActiveFilters =
    search.trim() !== "" ||
    category !== null ||
    pointsRange !== null ||
    sort !== "recommended";

  // Al cambiar cualquier filtro, vuelve a la primera página de resultados.
  const resetPagination = () => setVisibleCount(PAGE_SIZE);

  const clearFilters = () => {
    setSearch("");
    setCategory(null);
    setPointsRange(null);
    setSort("recommended");
    resetPagination();
  };

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
    if (visibleCount >= Math.min(pending.count, filtered.length || pending.count)) {
      pendingReturn.current = null;
      requestAnimationFrame(() => window.scrollTo(0, pending.scrollY));
    }
  }, [visibleCount, filtered.length]);

  const goToVoucher = (slug: string) => {
    sessionStorage.setItem(
      RETURN_STATE_KEY,
      JSON.stringify({ count: visibleCount, scrollY: window.scrollY }),
    );
    router.push(`/catalogo/${slug}`);
  };

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

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
            <div className="mb-6 space-y-4 sm:mb-8">
              {/* Buscador por nombre */}
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPagination();
                  }}
                  placeholder="Buscar bonos por nombre..."
                  aria-label="Buscar bonos por nombre"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-custom-green focus:outline-none focus:ring-1 focus:ring-custom-green"
                />
              </div>

              {/* Filtros y orden */}
              <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="catalogo-sort"
                    className="text-sm font-medium text-gray-600"
                  >
                    Ordenar:
                  </label>
                  <select
                    id="catalogo-sort"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as SortOption);
                      resetPagination();
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-custom-green focus:outline-none focus:ring-1 focus:ring-custom-green cursor-pointer"
                  >
                    <option value="recommended">Recomendado</option>
                    <option value="points-asc">Menos puntos</option>
                    <option value="points-desc">Más puntos</option>
                  </select>
                </div>

                {/* Rango de puntos */}
                <div className="flex flex-wrap gap-2">
                  {POINTS_RANGES.map((range) => (
                    <Chip
                      key={range.key}
                      active={pointsRange === range.key}
                      onClick={() => {
                        setPointsRange((cur) => (cur === range.key ? null : range.key));
                        resetPagination();
                      }}
                    >
                      {range.label}
                    </Chip>
                  ))}
                </div>

                {/* Categoría (solo si hay más de una en el catálogo) */}
                {availableCategories.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((cat) => (
                      <Chip
                        key={cat}
                        active={category === cat}
                        onClick={() => {
                          setCategory((cur) => (cur === cat ? null : cat));
                          resetPagination();
                        }}
                      >
                        {CATEGORY_LABELS[cat] ?? cat}
                      </Chip>
                    ))}
                  </div>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-medium text-accent underline-offset-2 hover:underline cursor-pointer lg:ml-auto"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          {vouchers.length > 0 && (
            <p className="text-sm text-gray-500 mb-6 sm:mb-8 lg:mb-10">
              Mostrando {visible.length} de {filtered.length} bonos
            </p>
          )}
          <div className="space-y-6 sm:space-y-10 lg:space-y-16">
            {vouchers.length === 0 ? (
              <p className="text-center text-gray-400">No hay vouchers disponibles.</p>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">
                  No encontramos bonos que coincidan con tu búsqueda.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 text-sm font-medium text-custom-green underline-offset-2 hover:underline cursor-pointer"
                >
                  Limpiar filtros
                </button>
              </div>
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
