"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Logo from "@/img/logo-mi-premio.svg";
import {
  INFORME_SECTIONS,
  informeSectionHref,
} from "@/views/admin/informes/sections";
import { canManageAdmins, roleLabel } from "@/lib/admin-roles";

interface AdminShellProps {
  adminName: string;
  adminEmail: string;
  adminRole: string;
  children: ReactNode;
}

// Las etiquetas y reglas de rol viven en `lib/admin-roles.ts`, sin
// dependencias de servidor, para poder usarlas también desde el cliente.

interface NavItem {
  href: string;
  label: string;
  icon: string;
  children?: Array<{ href: string; label: string }>;
}

/**
 * Navegación del panel. Sumar un módulo es agregar una entrada; sus
 * secciones van en `children` y se despliegan al estar dentro del módulo.
 *
 * `Usuarios` solo aparece para quien puede gestionarlo. Es cosmético: la
 * autorización real la aplican la página y los route handlers.
 */
function navItemsFor(role: string): NavItem[] {
  const items: NavItem[] = [
    {
      href: "/admin/informes",
      label: "Informes",
      icon: "▤",
      children: INFORME_SECTIONS.map((section) => ({
        href: informeSectionHref(section.slug),
        label: section.label,
      })),
    },
  ];

  if (canManageAdmins(role)) {
    items.push({ href: "/admin/usuarios", label: "Usuarios", icon: "◍" });
  }

  return items;
}

export default function AdminShell({
  adminName,
  adminEmail,
  adminRole,
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

  const navItems = navItemsFor(adminRole);

  return (
    // Marco de la altura del viewport: el scroll vive dentro del contenido,
    // no en la página. Así la barra lateral nunca crece más que la pantalla y
    // "Cerrar sesión" queda siempre a la vista.
    // `dvh` en vez de `vh` para que la barra del navegador móvil no la corte.
    <div className="flex h-dvh overflow-hidden bg-[#f6f6f6]">
      {/* -------------------------------------------------------- barra lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-custom-green text-white transition-transform lg:static lg:h-full lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="shrink-0 border-b border-white/15 px-5 py-5">
          <Link
            href="/admin"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3"
          >
            {/* El logo es verde de marca: sobre la barra verde se perdería,
                así que va sobre una placa blanca en vez de recolorearlo. */}
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={Logo.src} alt="" className="h-full w-auto" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-wide">
                Mi Premio
              </span>
              <span className="block text-xs text-white/70">
                Panel administrativo
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const inModule = Boolean(pathname?.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      inModule
                        ? "bg-white/15 font-semibold"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>

                  {/* El submenú solo se despliega dentro del módulo */}
                  {item.children && inModule && (
                    <ul className="mt-1 flex flex-col gap-0.5 border-l border-white/20 pl-3 ml-4">
                      {item.children.map((child) => {
                        const active = pathname === child.href;
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => setMenuOpen(false)}
                              aria-current={active ? "page" : undefined}
                              className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                active
                                  ? "bg-white/20 font-semibold text-white"
                                  : "text-white/75 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* La identidad y el cierre de sesión viven ahora en la barra superior,
            visible en todo momento; repetirlos aquí sería redundante. */}
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
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-black/10 bg-white px-4 py-2.5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="cursor-pointer rounded-lg border border-black/15 px-3 py-1.5 text-sm lg:hidden"
          >
            ☰
          </button>

          {/* En escritorio el logo ya está en la barra lateral */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={Logo.src} alt="Mi Premio" className="h-8 w-auto lg:hidden" />

          <div className="ml-auto flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-custom-green text-xs font-semibold text-white"
            >
              {initials}
            </span>

            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-[#0b0b0b]">
                {adminName}
              </p>
              <p className="truncate text-xs text-[#52514e]">
                <span className="font-medium text-custom-green">
                  {roleLabel(adminRole)}
                </span>
                {/* El correo se oculta en pantallas estrechas: identifica la
                    cuenta, pero el nombre y el rol son lo que importa */}
                <span className="hidden sm:inline"> · {adminEmail}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="ml-1 shrink-0 cursor-pointer rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium text-[#0b0b0b] transition-colors hover:border-custom-green hover:text-custom-green disabled:opacity-60"
            >
              {loggingOut ? "Saliendo…" : "Salir"}
            </button>
          </div>
        </header>

        {/* Único elemento con scroll de la pantalla */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
