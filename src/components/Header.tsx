"use client";

import logo from "@/img/logo-mi-premio.svg";
import Button from "@/utils/Button";
import Link from "next/link";
import { useState, useEffect } from "react";
import iconUser from "@/img/user-check.svg";
import { useRouter } from "next/navigation";
import { FcMenu } from "react-icons/fc";

interface SessionUser {
  email: string;
  fullName: string;
  contactId: string;
}

export default function Header() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.refresh();
  };

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Catálogo", href: "/catalogo" },
    ...(user ? [{ label: "Perfil", href: "/perfil" }] : []),
    { label: "Pricing", href: "#" },
    { label: "Community", href: "#" },
    { label: "Support", href: "#" },
  ];

  return (
    <div className="w-full bg-white">
      {/* Top bar */}
      <div className="w-full bg-custom-green py-2 px-2 lg:hidden">
        {!isLoading &&
          (user ? (
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="text-white font-medium truncate">{user.fullName}</span>
              <Button variant="tertiary" onClick={handleLogout} className="h-8! uppercase shrink-0">
                Salir
              </Button>
            </div>
          ) : (
            <Link href="/auth/login" className="block">
              <Button variant="secondary" className="w-full h-8! uppercase">
                Login
              </Button>
            </Link>
          ))}
      </div>

      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between py-3 px-2">
        <div className="flex justify-between items-center lg:justify-start w-full gap-4 px-2 lg:px-0">
          <img
            className="w-full max-w-18 lg:max-w-28 cursor-pointer"
            onClick={() => router.push("/")}
            src={logo.src}
            alt="logo"
          />

          {/* Toggle mobile menu */}
          <div className="lg:hidden">
            <button className="border border-slate-200 rounded-lg p-2 w-12 h-12 flex items-center justify-center">
              <FcMenu className="text-3xl" />
            </button>
          </div>

          <nav className="ml-16 hidden lg:block">
            <ul className="flex items-center gap-10">
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link
                    className="text-black underline underline-offset-6 decoration-2 decoration-transparent hover:decoration-custom-green font-bold hover:text-custom-green transition-colors duration-300"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="hidden lg:flex items-center">
          {isLoading ? (
            <div className="h-12 w-24 animate-pulse bg-slate-100 rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-6">
              <Button variant="secondary" className="whitespace-nowrap" onClick={handleLogout}>
                Salida segura
              </Button>
              <span className="text-black font-bold whitespace-nowrap">{user.fullName}</span>
              <img className="w-6 h-6 ml-2" src={iconUser.src} alt="icon-user" />
            </div>
          ) : (
            <Link href="/auth/login">
              <Button variant="secondary">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
