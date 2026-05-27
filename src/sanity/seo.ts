import type { Metadata } from "next";
import { urlFor } from "./image";
import { sanityFetch } from "./fetch";
import { siteSettingsQuery } from "./queries";
import type { SanityImage, Seo, SiteSettings } from "./types";

export const SITE_NAME = "Mi Premio";

/** URL pública del sitio. Reutiliza la convención usada en los emails. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://mipremiogermanmoraleshoteles.com"
).replace(/\/$/, "");

const DEFAULT_DESCRIPTION =
  "Programa de lealtad Mi Premio: acumula puntos, explora el catálogo y canjea tus premios.";

function ogImageUrl(source?: SanityImage | null): string | undefined {
  if (!source) return undefined;
  return urlFor(source).width(1200).height(630).fit("crop").auto("format").url();
}

interface BuildMetadataArgs {
  /** SEO específico del documento (Sanity). */
  seo?: Seo | null;
  /** SEO global de respaldo (siteSettings.defaultSeo). */
  defaults?: Seo | null;
  /** Título de respaldo si el SEO de Sanity no trae uno. */
  title?: string;
  /** Descripción de respaldo. */
  description?: string;
  /** Imagen de respaldo para Open Graph (p. ej. la imagen del voucher). */
  image?: SanityImage | null;
  /** Ruta absoluta del sitio para canonical/OG (p. ej. "/catalogo"). */
  path?: string;
  /** No usar el sufijo "| Mi Premio" (para la home). */
  absoluteTitle?: boolean;
  /** Excluir de indexación (páginas privadas o transaccionales). */
  noindex?: boolean;
}

/**
 * Construye el objeto `Metadata` de Next.js a partir del SEO de Sanity,
 * con respaldos sensatos. El sufijo de marca lo aporta el template del
 * layout raíz, por eso aquí el título va "pelado" salvo `absoluteTitle`.
 */
export function buildMetadata({
  seo,
  defaults,
  title,
  description,
  image,
  path = "/",
  absoluteTitle = false,
  noindex = false,
}: BuildMetadataArgs): Metadata {
  const resolvedTitle = seo?.title ?? title;
  const resolvedDescription =
    seo?.description ?? description ?? defaults?.description ?? DEFAULT_DESCRIPTION;
  const ogUrl = ogImageUrl(seo?.ogImage ?? image ?? defaults?.ogImage);

  return {
    ...(resolvedTitle
      ? { title: absoluteTitle ? { absolute: resolvedTitle } : resolvedTitle }
      : {}),
    description: resolvedDescription,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      ...(resolvedTitle ? { title: resolvedTitle } : {}),
      description: resolvedDescription,
      url: path,
      siteName: SITE_NAME,
      locale: "es_CO",
      type: "website",
      ...(ogUrl ? { images: [{ url: ogUrl, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(resolvedTitle ? { title: resolvedTitle } : {}),
      description: resolvedDescription,
      ...(ogUrl ? { images: [ogUrl] } : {}),
    },
  };
}

/** Lee el SEO por defecto y el nombre del sitio desde `siteSettings`. */
export async function getSeoDefaults(): Promise<{
  siteTitle: string;
  defaultSeo?: Seo;
}> {
  const settings = await sanityFetch<SiteSettings | null>(
    siteSettingsQuery,
    {},
    ["siteSettings"],
  );
  return {
    siteTitle: settings?.title ?? SITE_NAME,
    defaultSeo: settings?.defaultSeo ?? undefined,
  };
}
