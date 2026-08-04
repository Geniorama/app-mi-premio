"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface AdminShellProps {
  adminName: string;
  adminEmail: string;
  children: ReactNode;
}

/**
 * Estructura del panel. La navegación se declara aquí para que sumar un
 * módulo nuevo sea agregar una entrada (el primero es Informes).
 */
const NAV_ITEMS = [
  { href: "/admin/informes", label: "Informes", icon: "▤" },
];

export default function AdminShell({
  adminName,
  adminEmail,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin/login";
    }
  };

  const initials =
    adminName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="flex min-h-screen bg-[#f6f6f6]">
      {/* -------------------------------------------------------- barra lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-custom-green text-white transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/15 px-5 py-5">
          <p className="text-sm font-semibold tracking-wide">Mi Premio</p>
          <p className="text-xs text-white/70">Panel administrativo</p>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-white/15 font-semibold"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/15 px-4 py-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{adminName}</p>
              <p className="truncate text-xs text-white/70">{adminEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-3 w-full cursor-pointer rounded-lg border border-white/30 px-3 py-1.5 text-xs transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            {loggingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      {/* ------------------------------------------------------ área de trabajo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-black/10 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="cursor-pointer rounded-lg border border-black/15 px-3 py-1.5 text-sm"
          >
            ☰
          </button>
          <span className="text-sm font-semibold">Panel administrativo</span>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
