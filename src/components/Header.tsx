"use client";

import logoDefault from "@/img/logo-mi-premio.svg";
import Button from "@/utils/Button";
import Link from "next/link";
import { useState, useEffect } from "react";
import iconUser from "@/img/user-check.svg";
import { useRouter } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import type { LinkItem } from "@/sanity/types";

interface SessionUser {
  email: string;
  fullName: string;
  contactId: string;
}

interface HeaderProps {
  logoUrl?: string;
  nav?: LinkItem[];
}

// Insignia de puntos del usuario. `dark` se usa sobre fondo verde (barra móvil).
function PointsBadge({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap ${
        dark ? "bg-white/20 text-white" : "bg-custom-green/10 text-custom-green"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
      {label}
    </span>
  );
}

export default function Header({ logoUrl, nav }: HeaderProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        // Si hay sesión, traemos el saldo de puntos de la membresía.
        if (data.user) {
          fetch("/api/user/membership")
            .then((r) => (r.ok ? r.json() : null))
            .then((m) => {
              if (active && m?.membership?.puntos != null) {
                setPoints(m.membership.puntos);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pointsLabel =
    points != null ? `${points.toLocaleString("es-CO")} pts` : null;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const navItems = (nav ?? []).filter((item) =>
    item.requiresAuth ? !!user : true,
  );

  return (
    <div className="w-full bg-white">
      {/* Top bar */}
      <div className="w-full bg-custom-green py-2 px-2 lg:hidden">
        {!isLoading &&
          (user ? (
            <div className="flex items-center justify-between gap-2 px-2">
              <Link
                href="/perfil"
                className="text-white font-medium truncate hover:underline"
              >
                {user.fullName}
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                {pointsLabel && <PointsBadge label={pointsLabel} dark />}
                <Button variant="tertiary" onClick={handleLogout} className="h-8! uppercase shrink-0">
                  Salir
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-4 px-2">
              <Link
                href="/registro"
                className="text-sm font-bold uppercase text-white underline underline-offset-4 decoration-white/80 hover:decoration-white"
              >
                Registro
              </Link>
              <Link href="/auth/login">
                <Button
                  variant="tertiary"
                  className="!w-auto !h-8 !md:w-auto px-4 text-xs uppercase font-bold rounded-md shadow-none"
                >
                  Login
                </Button>
              </Link>
            </div>
          ))}
      </div>

      <div className="relative w-full max-w-[1600px] mx-auto flex items-center justify-between py-3 px-4 lg:px-6">
        <div className="flex justify-between items-center lg:justify-start w-full gap-4 px-2 lg:px-0">
          <img
            className="w-full max-w-18 lg:max-w-28 cursor-pointer"
            onClick={() => router.push("/")}
            src={logoUrl || logoDefault.src}
            alt="logo"
          />

          <div className="lg:hidden">
            <button
              type="button"
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav"
              onClick={() => setIsMenuOpen((v) => !v)}
              className="border border-slate-200 rounded-lg p-2 w-12 h-12 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
            >
              {isMenuOpen ? (
                <FiX className="text-2xl text-custom-green" />
              ) : (
                <FiMenu className="text-2xl text-custom-green" />
              )}
            </button>
          </div>

          <nav className="ml-16 hidden lg:block">
            <ul className="flex items-center gap-10">
              {navItems.map((item, i) => (
                <li key={`${item.label}-${i}`}>
                  <Link
                    className="text-black underline underline-offset-6 decoration-2 decoration-transparent hover:decoration-custom-green font-bold hover:text-custom-green transition-colors duration-300"
                    href={item.href}
                    target={item.target ?? "_self"}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {isMenuOpen && (
          <nav
            id="mobile-nav"
            className="lg:hidden absolute left-0 right-0 top-full z-40 bg-white border-t border-slate-200 shadow-lg"
          >
            <ul className="flex flex-col py-2">
              {navItems.map((item, i) => (
                <li key={`m-${item.label}-${i}`}>
                  <Link
                    href={item.href}
                    target={item.target ?? "_self"}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-6 py-3 text-black font-bold hover:bg-slate-50 hover:text-custom-green transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="hidden lg:flex items-center">
          {isLoading ? (
            <div className="h-12 w-24 animate-pulse bg-slate-100 rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-6">
              <Button variant="secondary" className="whitespace-nowrap" onClick={handleLogout}>
                Salida segura
              </Button>
              <Link
                href="/perfil"
                className="flex items-center gap-3 text-black font-bold whitespace-nowrap hover:text-custom-green transition-colors"
              >
                {pointsLabel && <PointsBadge label={pointsLabel} />}
                {user.fullName}
                <img className="w-6 h-6" src={iconUser.src} alt="icon-user" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/registro"
                className="font-bold text-black underline underline-offset-6 decoration-2 decoration-transparent transition-colors hover:text-custom-green hover:decoration-custom-green"
              >
                Registro
              </Link>
              <Link href="/auth/login">
                <Button variant="secondary" className="whitespace-nowrap">
                  Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
