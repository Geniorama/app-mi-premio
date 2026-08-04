import { groq } from "next-sanity";

const heroFields = /* groq */ `
  title,
  subtitle,
  description,
  image,
  backgroundImage,
  buttonText,
  buttonLink
`;

const seoFields = /* groq */ `
  title,
  description,
  ogImage
`;

export const siteSettingsQuery = groq`
  *[_id == "siteSettings"][0]{
    title,
    logo,
    logoDark,
    headerNav[]{label, href, target, requiresAuth},
    footerColumn1[]{label, href, target, requiresAuth},
    footerColumn2[]{label, href, target, requiresAuth},
    socialLinks[]{platform, href},
    footerCopyright,
    defaultSeo{${seoFields}}
  }
`;

export const homePageQuery = groq`
  *[_id == "homePage"][0]{
    hero{${heroFields}},
    featuresSection{
      title,
      items[]{icon, title, description, linkLabel, linkHref}
    },
    contentBlock{title, body, image, buttonText, buttonLink},
    seo{${seoFields}}
  }
`;

export const catalogoPageQuery = groq`
  *[_id == "catalogoPage"][0]{
    hero{${heroFields}},
    loadMoreLabel,
    seo{${seoFields}}
  }
`;

export const perfilPageQuery = groq`
  *[_id == "perfilPage"][0]{
    hero{${heroFields}},
    welcomeMessage,
    profileImage,
    suggestedBlock{title, body, image},
    carouselLoadMoreLabel,
    seo{${seoFields}}
  }
`;

export const extractosPageQuery = groq`
  *[_id == "extractosPage"][0]{
    hero{${heroFields}},
    motivationBlock{title, body, image},
    infoBlocks[]{title, body},
    seo{${seoFields}}
  }
`;

export const graciasPageQuery = groq`
  *[_id == "graciasPage"][0]{
    title, body, image, buttonText, buttonLink,
    seo{${seoFields}}
  }
`;

export const registroPageQuery = groq`
  *[_id == "registroPage"][0]{
    title, description, zohoFormUrl,
    seo{${seoFields}}
  }
`;

export const loginPageQuery = groq`
  *[_id == "loginPage"][0]{
    title,
    subtitle,
    formHeading,
    emailPlaceholder,
    sendCodeButtonLabel,
    verifyCodeButtonLabel,
    seo{${seoFields}}
  }
`;

export const vouchersListQuery = groq`
  *[_type == "voucher" && active == true] | order(coalesce(order, 9999) asc, _createdAt desc){
    _id,
    title,
    "slug": slug.current,
    image,
    pointsValue,
    priceCOP,
    category
  }
`;

export const vouchersFeaturedQuery = groq`
  *[_type == "voucher" && active == true && featuredInPerfil == true]
    | order(coalesce(order, 9999) asc, _createdAt desc)[0...12]{
    _id,
    title,
    "slug": slug.current,
    image,
    pointsValue,
    priceCOP
  }
`;

export const voucherBySlugQuery = groq`
  *[_type == "voucher" && slug.current == $slug && active == true][0]{
    _id,
    title,
    "slug": slug.current,
    image,
    shortDescription,
    terms,
    priceCOP,
    pointsValue,
    deliveryTime,
    validUntil,
    category,
    stackable
  }
`;

export const legalPageBySlugQuery = groq`
  *[_type == "legalPage" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    updatedAt,
    body,
    seo{${seoFields}}
  }
`;

export const legalPageSlugsQuery = groq`
  *[_type == "legalPage" && defined(slug.current)].slug.current
`;

// ----------------------------------------------------- panel administrativo

/**
 * Administradores activos con un correo dado. `lower(email)` normaliza el dato
 * tal como lo guardó el editor en el Studio.
 *
 * Devuelve una lista, no el primer resultado: si por error existen dos
 * documentos con el mismo correo, quien llama decide con cuál se queda en vez
 * de depender del orden que devuelva Sanity.
 */
export const adminUsersByEmailQuery = groq`
  *[_type == "adminUser" && lower(email) == $email && active == true] | order(_id asc){
    _id,
    email,
    name,
    role,
    active
  }
`;

/**
 * Auditoría de redenciones hechas desde la web. Complementa al módulo
 * Redenciones de Zoho, que no sabe qué bono se pidió ni a dónde se entrega.
 */
export const redemptionsAuditQuery = groq`
  *[_type == "redemption"] | order(redeemedAt desc){
    _id,
    zohoRedemptionId,
    zohoMembershipId,
    email,
    pointsRedeemed,
    status,
    redeemedAt,
    processedAt,
    deliveryEmail,
    deliveryCode,
    "voucherTitle": voucher->title,
    "voucherSlug": voucher->slug.current,
    "voucherCategory": voucher->category,
    "voucherPoints": voucher->pointsValue
  }
`;
