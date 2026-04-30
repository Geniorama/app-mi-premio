"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import BgSnap2 from "@/img/bg-snap-2.svg";
import CarouselOffers from "@/components/CarouselOffers";
import Button from "@/utils/Button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { urlFor, buildImageSet } from "@/sanity/image";
import type { PerfilPage, VoucherCard } from "@/sanity/types";

const VOUCHER_CARD_WIDTHS = [320, 480, 640, 800];

interface UserSession {
  email: string;
  fullName: string;
  contactId: string;
}

interface Membership {
  id: string;
  puntos: number | null;
  categoria: string | null;
}

interface PerfilAfiliadoViewProps {
  vouchers: VoucherCard[];
  page: PerfilPage | null;
}

const VOUCHER_PLACEHOLDER =
  "https://placehold.co/400x400/E85D04/white?text=VOUCHER";

export default function PerfilAfiliadoView({
  vouchers,
  page,
}: PerfilAfiliadoViewProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/membership").then((r) => (r.ok ? r.json() : null)),
    ]).then(([meData, membershipData]) => {
      if (meData?.user) setUser(meData.user);
      if (membershipData?.membership) setMembership(membershipData.membership);
      setLoading(false);
    });
  }, []);
  const offers = vouchers.map((v) => {
    const imgSet = v.image ? buildImageSet(v.image, VOUCHER_CARD_WIDTHS) : null;
    return {
      id: v._id,
      image: imgSet?.src ?? VOUCHER_PLACEHOLDER,
      imageSrcSet: imgSet?.srcSet,
      title: v.title,
      price:
        v.pointsValue != null
          ? `${v.pointsValue.toLocaleString("es-CO")} puntos`
          : undefined,
      handleClick: () => router.push(`/catalogo/${v.slug}`),
    };
  });

  const heroSet = page?.hero?.image
    ? buildImageSet(page.hero.image, [320, 480, 640, 800])
    : null;
  const heroBg = page?.hero?.backgroundImage
    ? urlFor(page.hero.backgroundImage).width(1920).auto("format").url()
    : undefined;
  const profileSet = page?.profileImage
    ? buildImageSet(page.profileImage, [320, 480, 640, 800])
    : null;
  const profileImage = profileSet?.src ?? "https://placehold.co/400x600";
  const suggested = page?.suggestedBlock;
  const suggestedSet = suggested?.image
    ? buildImageSet(suggested.image, [400, 600, 800, 1024, 1200])
    : null;
  const suggestedImage = suggestedSet?.src ?? "https://placehold.co/1920x1080";
  const loadMoreLabel = page?.carouselLoadMoreLabel;
  const welcomeMessage =
    page?.welcomeMessage ??
    "lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
  const suggestedTitle = suggested?.title ?? "Elemento sugerido";
  const suggestedBody =
    suggested?.body ??
    "lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

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
          onClick={
            page?.hero?.buttonLink
              ? () => router.push(page.hero!.buttonLink!)
              : undefined
          }
        />
        <section className="w-full bg-white p-12 lg:py-24 flex-col items-center justify-center bg-cover min-h-screen bg-center bg-no-repeat" style={{ backgroundImage: `url(${BgSnap2.src})` }}>
            <Container>
                <div className="flex flex-col lg:flex-row items-center gap-10">
                    <div className="md:w-2/3 w-full text-center lg:pr-30">
                       {loading ? (
                         <div className="space-y-4 animate-pulse">
                           <div className="h-10 bg-slate-200 rounded w-2/3 mx-auto" />
                           <div className="h-10 bg-slate-200 rounded w-1/2 mx-auto" />
                           <div className="h-8 bg-slate-200 rounded w-1/3 mx-auto" />
                         </div>
                       ) : !membership ? (
                         <p className="text-2xl text-gray-400 font-medium">
                           Información no disponible
                         </p>
                       ) : (
                         <>
                           <h2 className="text-4xl font-bold mb-5 text-custom-green">
                             {user?.fullName ?? "—"}
                           </h2>
                           <h3 className="text-4xl font-bold mb-5 text-accent">
                             {membership.puntos != null
                               ? `${membership.puntos.toLocaleString("es-CO")} puntos`
                               : "— puntos"}
                           </h3>
                           <p className="text-3xl">{membership.categoria ?? "—"}</p>
                         </>
                       )}

                       <p className="mt-6 text-left whitespace-pre-line">
                         {welcomeMessage}
                       </p>
                    </div>
                    <div className="md:w-1/3 w-full">
                       <img
                         src={profileImage}
                         srcSet={profileSet?.srcSet}
                         sizes="(min-width: 1024px) 33vw, (min-width: 768px) 33vw, 100vw"
                         alt={page?.profileImage?.alt ?? "profile"}
                         loading="lazy"
                         decoding="async"
                         className="w-full h-full object-cover"
                       />
                    </div>
                </div>
            </Container>
        </section>

        <section className="p-12 lg:py-24">
          <Container>
            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="md:w-1/2 w-full">
                <img
                  src={suggestedImage}
                  srcSet={suggestedSet?.srcSet}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  alt={suggestedTitle}
                  loading="lazy"
                  decoding="async"
                  className="w-full"
                />
              </div>
              <div className="md:w-1/2 w-full">
                <h2 className="text-4xl font-bold mb-5 text-custom-green">{suggestedTitle}</h2>
                <p className="whitespace-pre-line">{suggestedBody}</p>
              </div>
            </div>
          </Container>
        </section>

        <section className="p-12 lg:py-24">
            <Container>
                {offers.length === 0 ? (
                  <p className="text-center text-gray-400">
                    No hay vouchers disponibles por ahora.
                  </p>
                ) : (
                  <>
                    <CarouselOffers offers={offers} />
                    {loadMoreLabel && (
                      <Button
                        onClick={() => router.push("/catalogo")}
                        className="w-full mx-auto mt-4"
                        variant="secondary"
                      >
                        {loadMoreLabel}
                      </Button>
                    )}
                  </>
                )}
            </Container>
        </section>
    </div>
  )
}
