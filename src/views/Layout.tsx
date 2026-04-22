import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sanityFetch } from "@/sanity/fetch";
import { siteSettingsQuery } from "@/sanity/queries";
import { urlFor } from "@/sanity/image";
import type { SiteSettings } from "@/sanity/types";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const settings = await sanityFetch<SiteSettings | null>(siteSettingsQuery, {}, ["siteSettings"]);

  const headerLogo = settings?.logo ? urlFor(settings.logo).width(240).url() : undefined;
  const footerLogo = settings?.logoDark
    ? urlFor(settings.logoDark).width(300).url()
    : settings?.logo
      ? urlFor(settings.logo).width(300).url()
      : undefined;

  return (
    <div>
      <Header logoUrl={headerLogo} nav={settings?.headerNav} />
      {children}
      <Footer
        logoUrl={footerLogo}
        menuColumn1={settings?.footerColumn1}
        menuColumn2={settings?.footerColumn2}
        socialLinks={settings?.socialLinks}
        copyright={settings?.footerCopyright}
      />
    </div>
  );
}
