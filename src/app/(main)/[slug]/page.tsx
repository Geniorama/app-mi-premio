import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Container from "@/utils/Container";
import { PortableText } from "@portabletext/react";
import { sanityFetch } from "@/sanity/fetch";
import { legalPageBySlugQuery, legalPageSlugsQuery } from "@/sanity/queries";
import { buildMetadata, getSeoDefaults } from "@/sanity/seo";
import type { LegalPage } from "@/sanity/types";

interface Params {
  slug: string;
}

export async function generateStaticParams() {
  const slugs = await sanityFetch<string[]>(legalPageSlugsQuery, {}, ["legalPage"]);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [page, { defaultSeo }] = await Promise.all([
    sanityFetch<LegalPage | null>(legalPageBySlugQuery, { slug }, ["legalPage"]),
    getSeoDefaults(),
  ]);

  if (!page) {
    return buildMetadata({
      defaults: defaultSeo,
      title: "Página no encontrada",
      path: `/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    seo: page.seo,
    defaults: defaultSeo,
    title: page.title,
    path: `/${page.slug}`,
  });
}

export default async function LegalPageRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const page = await sanityFetch<LegalPage | null>(
    legalPageBySlugQuery,
    { slug },
    ["legalPage"],
  );

  if (!page) notFound();

  const updated = page.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <section className="w-full bg-white py-14 lg:py-20">
      <Container>
        <article className="mx-auto max-w-3xl">
          <header className="mb-10 space-y-2">
            <h1 className="text-3xl lg:text-5xl font-bold text-custom-green">
              {page.title}
            </h1>
            {updated && (
              <p className="text-sm text-gray-500">Última actualización: {updated}</p>
            )}
          </header>
          <div className="prose prose-slate max-w-none text-base leading-relaxed">
            <PortableText value={page.body} />
          </div>
        </article>
      </Container>
    </section>
  );
}
