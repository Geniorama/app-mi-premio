import type { Metadata } from "next";
import LoginView from "@/views/LoginView";
import { sanityFetch } from "@/sanity/fetch";
import { loginPageQuery } from "@/sanity/queries";
import { buildMetadata } from "@/sanity/seo";
import type { LoginPage } from "@/sanity/types";

export async function generateMetadata(): Promise<Metadata> {
  const page = await sanityFetch<LoginPage | null>(
    loginPageQuery,
    {},
    ["loginPage"],
  );
  return buildMetadata({
    seo: page?.seo,
    title: page?.title ?? "Iniciar sesión",
    path: "/auth/login",
    noindex: true,
  });
}

export default async function LoginPage() {
  const page = await sanityFetch<LoginPage | null>(
    loginPageQuery,
    {},
    ["loginPage"],
  );
  return <LoginView page={page} />;
}
