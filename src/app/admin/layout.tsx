import type { Metadata } from "next";

/**
 * El panel vive fuera de `(main)`: no hereda el Header ni el Footer públicos.
 * La protección real la aplica `middleware.ts`; aquí solo se marca `noindex`.
 */
export const metadata: Metadata = {
  title: "Panel administrativo",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
