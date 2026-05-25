import type { Metadata } from "next";
import RegistroView from "@/views/RegistroView";
import { sanityFetch } from "@/sanity/fetch";
import { registroPageQuery } from "@/sanity/queries";
import type { RegistroPage } from "@/sanity/types";

export const metadata: Metadata = {
  title: "Registro fidelización",
  description: "Formulario de registro al programa de fidelización.",
};

export default async function RegistroPage() {
  const page = await sanityFetch<RegistroPage | null>(
    registroPageQuery,
    {},
    ["registroPage"],
  );
  return <RegistroView page={page} />;
}
