import logoDefault from "@/img/logo-dark.svg";
import iconFacebook from "@/img/facebook-fill.svg";
import iconInstagram from "@/img/instagram-fill.svg";
import iconLinkedin from "@/img/linkedin-fill.svg";
import iconYoutube from "@/img/youtube-fill.svg";
import Link from "next/link";
import Container from "@/utils/Container";
import { FaWhatsapp } from "react-icons/fa";
import { WHATSAPP_NUMBER, WHATSAPP_URL } from "@/utils/whatsapp";
import type { LinkItem, SocialLink } from "@/sanity/types";

interface FooterProps {
  logoUrl?: string;
  menuColumn1?: LinkItem[];
  menuColumn2?: LinkItem[];
  socialLinks?: SocialLink[];
  copyright?: string;
}

const SOCIAL_ICON: Record<SocialLink["platform"], string> = {
  facebook: iconFacebook.src,
  instagram: iconInstagram.src,
  linkedin: iconLinkedin.src,
  youtube: iconYoutube.src,
  twitter: iconFacebook.src,
  tiktok: iconInstagram.src,
};

export default function Footer({
  logoUrl,
  menuColumn1,
  menuColumn2,
  socialLinks,
  copyright,
}: FooterProps) {
  const col1 = menuColumn1 ?? [];
  const col2 = menuColumn2 ?? [];
  const social = socialLinks ?? [];

  return (
    <footer className="w-full bg-[#195308] pt-12 pb-8 px-4 lg:px-6">
      <Container>
        <div className="w-full flex flex-col md:flex-row items-center justify-between">
          <div className="w-full lg:w-1/3">
            <ul className="flex flex-col md:flex-row items-center justify-between gap-4">
              {col1.map((item, i) => (
                <li key={`${item.label}-${i}`}>
                  <Link
                    className="text-white font-bold"
                    target={item.target ?? "_self"}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full lg:w-1/3">
            <img
              className="w-full max-w-[150px] mx-auto"
              src={logoUrl || logoDefault.src}
              alt="logo"
            />
          </div>
          <div className="w-full lg:w-1/3">
            <ul className="flex flex-col md:flex-row items-center justify-between gap-4">
              {col2.map((item, i) => (
                <li key={`${item.label}-${i}`}>
                  <Link
                    className="text-white font-bold"
                    target={item.target ?? "_self"}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center">
          <ul className="flex items-center justify-center gap-4">
            {social.map((item) => (
              <li key={item.platform}>
                <Link
                  className="h-12 w-12 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 transition-colors duration-300 rounded-full"
                  href={item.href}
                  target="_blank"
                >
                  <img
                    src={SOCIAL_ICON[item.platform]}
                    alt={item.platform}
                    className="w-6 h-6"
                  />
                </Link>
              </li>
            ))}
            <li>
              <Link
                className="h-12 w-12 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 transition-colors duration-300 rounded-full"
                href={WHATSAPP_URL}
                target="_blank"
                aria-label={`WhatsApp ${WHATSAPP_NUMBER}`}
              >
                <FaWhatsapp className="w-6 h-6 text-[#195308]" />
              </Link>
            </li>
          </ul>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-white mt-4 text-sm hover:underline"
          >
            WhatsApp: {WHATSAPP_NUMBER}
          </a>

          {copyright && (
            <p className="text-white mt-8 text-sm">{copyright}</p>
          )}
        </div>
      </Container>
    </footer>
  );
}
