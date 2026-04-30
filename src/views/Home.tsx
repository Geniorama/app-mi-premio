"use client";

import Button from "@/utils/Button";
import imgSnap from "@/img/bg-snap-photos.svg";
import star1 from "@/img/star-1.svg";
import Container from "@/utils/Container";
import imageExample from "@/img/image-example.webp";
import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import { urlFor, buildImageSet } from "@/sanity/image";
import type { HomePage } from "@/sanity/types";

interface HomeViewProps {
  data: HomePage | null;
}

export default function HomeView({ data }: HomeViewProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const featuresTitle =
    data?.featuresSection?.title ?? "Snap photos and share \nlike never before";
  const featureItems = data?.featuresSection?.items?.length
    ? data.featuresSection.items.map((item, i) => ({
        key: `cms-${i}`,
        title: item.title,
        description: item.description ?? "",
        icon: item.icon ? urlFor(item.icon).width(80).url() : star1.src,
        href: item.linkHref,
        linkLabel: item.linkLabel ?? "Leer más",
      }))
    : FALLBACK_ITEMS;

  const contentBlock = data?.contentBlock;
  const contentSet = contentBlock?.image
    ? buildImageSet(contentBlock.image, [400, 600, 800, 1024, 1200])
    : null;
  const contentImage = contentSet?.src ?? imageExample.src;

  const heroSet = data?.hero?.image
    ? buildImageSet(data.hero.image, [320, 480, 640, 800])
    : null;
  const heroBg = data?.hero?.backgroundImage
    ? urlFor(data.hero.backgroundImage).width(1920).auto("format").url()
    : undefined;

  return (
    <div className="w-full text-white">
      <Hero
        title={data?.hero?.title}
        subtitle={data?.hero?.subtitle}
        description={data?.hero?.description}
        buttonText={data?.hero?.buttonText}
        image={heroSet?.src}
        imageSrcSet={heroSet?.srcSet}
        backgroundImage={heroBg}
      />

      <section
        className="w-full bg-[#F6F6F6] p-12 lg:py-24 flex-col text-center items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${!isMobile && imgSnap.src})` }}
      >
        <Container>
          <h2 className="text-4xl font-bold mb-5 text-custom-green uppercase whitespace-pre-line">
            {featuresTitle}
          </h2>
          <div className="flex justify-between gap-x-120 lg:gap-x-20 gap-y-10 text-left flex-wrap mt-16">
            {featureItems.map((item) => (
              <div className="md:w-1/3 w-full" key={item.key}>
                <div className="flex items-center gap-2">
                  <img src={item.icon} alt={item.title} className="w-8 h-8" />
                  <h3 className="text-custom-green font-bold text-2xl">{item.title}</h3>
                </div>
                <p className="text-black text-md">{item.description}</p>
                {item.href && (
                  <Button
                    className="w-full mt-4"
                    variant="tertiary"
                    onClick={() => window.open(item.href!, "_blank")}
                  >
                    {item.linkLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="w-full bg-white p-12 lg:py-24 flex-col items-center justify-center">
        <Container>
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="md:w-1/2 w-full">
              <img
                src={contentImage}
                srcSet={contentSet?.srcSet}
                sizes="(min-width: 1024px) 600px, (min-width: 768px) 50vw, 100vw"
                alt={contentBlock?.title ?? "image"}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="md:w-1/2 w-full">
              <h3 className="text-2xl font-bold mb-5 text-custom-green">
                {contentBlock?.title ?? "Sed ut perspiciatis unde omnis"}
              </h3>
              <p className="text-black text-md">
                {contentBlock?.body ??
                  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem."}
              </p>
              {contentBlock?.buttonText && (
                <Button
                  className="w-full mt-6"
                  variant="secondary"
                  onClick={() => {
                    if (contentBlock.buttonLink) window.location.href = contentBlock.buttonLink;
                  }}
                >
                  {contentBlock.buttonText}
                </Button>
              )}
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

const FALLBACK_ITEMS = [
  {
    key: "fallback-1",
    title: "Sed ut perspiciatis",
    description:
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
    icon: star1.src,
    href: undefined as string | undefined,
    linkLabel: "Leer más",
  },
];
