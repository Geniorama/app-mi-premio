import type { PortableTextBlock } from "@portabletext/react";

export interface SanityImage {
  asset: { _ref: string; _type: "reference" } | { url: string };
  hotspot?: { x: number; y: number; height: number; width: number };
  alt?: string;
}

export interface LinkItem {
  label: string;
  href: string;
  target?: "_self" | "_blank";
  requiresAuth?: boolean;
}

export interface SocialLink {
  platform: "facebook" | "instagram" | "linkedin" | "youtube" | "twitter" | "tiktok";
  href: string;
}

export interface Hero {
  title?: string;
  subtitle?: string;
  description?: string;
  image?: SanityImage;
  backgroundImage?: SanityImage;
  buttonText?: string;
  buttonLink?: string;
}

export interface FeatureCard {
  icon?: SanityImage;
  title: string;
  description?: string;
  linkLabel?: string;
  linkHref?: string;
}

export interface SiteSettings {
  title?: string;
  logo?: SanityImage;
  logoDark?: SanityImage;
  headerNav?: LinkItem[];
  footerColumn1?: LinkItem[];
  footerColumn2?: LinkItem[];
  socialLinks?: SocialLink[];
  footerCopyright?: string;
}

export interface VoucherCard {
  _id: string;
  title: string;
  slug: string;
  image?: SanityImage;
  pointsValue?: number;
  priceCOP?: number;
}

export interface Voucher extends VoucherCard {
  shortDescription?: string;
  terms?: PortableTextBlock[];
  deliveryTime?: string;
  validUntil?: string;
  category?: string;
  stackable?: boolean;
}

export interface HomePage {
  hero?: Hero;
  featuresSection?: {
    title?: string;
    items?: FeatureCard[];
  };
  contentBlock?: {
    title?: string;
    body?: string;
    image?: SanityImage;
    buttonText?: string;
    buttonLink?: string;
  };
}

export interface CatalogoPage {
  hero?: Hero;
  loadMoreLabel?: string;
}

export interface PerfilPage {
  hero?: Hero;
  welcomeMessage?: string;
  profileImage?: SanityImage;
  suggestedBlock?: {
    title?: string;
    body?: string;
    image?: SanityImage;
  };
  carouselLoadMoreLabel?: string;
}

export interface ExtractosPage {
  hero?: Hero;
  motivationBlock?: {
    title?: string;
    body?: string;
    image?: SanityImage;
  };
  infoBlocks?: { title?: string; body?: string }[];
}

export interface GraciasPage {
  title?: string;
  body?: string;
  image?: SanityImage;
  buttonText?: string;
  buttonLink?: string;
}

export interface RegistroPage {
  title?: string;
  description?: string;
  zohoFormUrl?: string;
}

export interface LoginPage {
  title?: string;
  subtitle?: string;
  formHeading?: string;
  emailPlaceholder?: string;
  sendCodeButtonLabel?: string;
  verifyCodeButtonLabel?: string;
}

export interface LegalPage {
  title: string;
  slug: string;
  updatedAt?: string;
  body: PortableTextBlock[];
}
