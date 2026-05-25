import LoginView from "@/views/LoginView";
import { sanityFetch } from "@/sanity/fetch";
import { loginPageQuery } from "@/sanity/queries";
import type { LoginPage } from "@/sanity/types";

export default async function LoginPage() {
  const page = await sanityFetch<LoginPage | null>(
    loginPageQuery,
    {},
    ["loginPage"],
  );
  return <LoginView page={page} />;
}
