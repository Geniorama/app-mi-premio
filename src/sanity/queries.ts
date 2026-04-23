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

export const siteSettingsQuery = groq`
  *[_id == "siteSettings"][0]{
    title,
    logo,
    logoDark,
    headerNav[]{label, href, target, requiresAuth},
    footerColumn1[]{label, href, target, requiresAuth},
    footerColumn2[]{label, href, target, requiresAuth},
    socialLinks[]{platform, href},
    footerCopyright
  }
`;

export const homePageQuery = groq`
  *[_id == "homePage"][0]{
    hero{${heroFields}},
    featuresSection{
      title,
      items[]{icon, title, description, linkLabel, linkHref}
    },
    contentBlock{title, body, image, buttonText, buttonLink}
  }
`;

export const catalogoPageQuery = groq`
  *[_id == "catalogoPage"][0]{
    hero{${heroFields}},
    loadMoreLabel
  }
`;

export const perfilPageQuery = groq`
  *[_id == "perfilPage"][0]{
    hero{${heroFields}},
    welcomeMessage,
    profileImage,
    suggestedBlock{title, body, image},
    carouselLoadMoreLabel
  }
`;

export const extractosPageQuery = groq`
  *[_id == "extractosPage"][0]{
    hero{${heroFields}},
    motivationBlock{title, body, image},
    infoBlocks[]{title, body}
  }
`;

export const graciasPageQuery = groq`
  *[_id == "graciasPage"][0]{
    title, body, image, buttonText, buttonLink
  }
`;

export const registroPageQuery = groq`
  *[_id == "registroPage"][0]{
    title, description, zohoFormUrl
  }
`;

export const loginPageQuery = groq`
  *[_id == "loginPage"][0]{
    title,
    subtitle,
    formHeading,
    emailPlaceholder,
    sendCodeButtonLabel,
    verifyCodeButtonLabel
  }
`;

export const vouchersListQuery = groq`
  *[_type == "voucher" && active == true] | order(coalesce(order, 9999) asc, _createdAt desc){
    _id,
    title,
    "slug": slug.current,
    image,
    pointsValue,
    priceCOP
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
    body
  }
`;

export const legalPageSlugsQuery = groq`
  *[_type == "legalPage" && defined(slug.current)].slug.current
`;
