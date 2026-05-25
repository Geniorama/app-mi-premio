"use client";

import Container from "@/utils/Container";
import Button from "@/utils/Button";
import { useRouter } from "next/navigation";
import { buildImageSet } from "@/sanity/image";
import type { GraciasPage } from "@/sanity/types";

interface GraciasViewProps {
  page: GraciasPage | null;
}

export default function GraciasView({ page }: GraciasViewProps) {
  const router = useRouter();

  const imageSet = page?.image
    ? buildImageSet(page.image, [400, 600, 800, 1000])
    : null;

  const buttonLink = page?.buttonLink ?? "/";
  const buttonText = page?.buttonText ?? "Volver al inicio";

  return (
    <div className="w-full bg-slate-100">
      <Container>
        <div className="flex flex-col lg:flex-row items-center justify-center gap-10 py-24 px-6">
          <div className="lg:w-1/2 space-y-6">
            <h1 className="text-4xl font-bold text-custom-green">
              {page?.title ?? "¡Gracias!"}
            </h1>
            {page?.body && (
              <p className="whitespace-pre-line">{page.body}</p>
            )}
            <Button variant="secondary" onClick={() => router.push(buttonLink)}>
              {buttonText}
            </Button>
          </div>
          <div className="lg:w-1/2">
            <img
              src={imageSet?.src ?? "https://placehold.co/800x600/"}
              srcSet={imageSet?.srcSet}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={page?.image?.alt ?? page?.title ?? "Gracias"}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
