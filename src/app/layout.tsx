import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { buildMetadata, getSeoDefaults, SITE_URL } from "@/sanity/seo";


const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle, defaultSeo } = await getSeoDefaults();
  const base = buildMetadata({
    seo: defaultSeo,
    title: siteTitle,
    path: "/",
    absoluteTitle: true,
  });

  return {
    ...base,
    metadataBase: new URL(SITE_URL),
    applicationName: siteTitle,
    title: {
      default: defaultSeo?.title ?? siteTitle,
      template: `%s | ${siteTitle}`,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="light">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className={`${montserrat.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
