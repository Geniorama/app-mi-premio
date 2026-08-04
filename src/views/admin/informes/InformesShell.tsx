"use client";

import { useState, type ReactNode } from "react";
import { RefreshProvider } from "./shared";
import type { InformeSection } from "./sections";

/**
 * Encabezado común a todas las secciones de Informes.
 *
 * El botón "Actualizar datos" vive aquí y no en cada sección, así que el
 * token viaja por contexto: con las secciones convertidas en rutas propias
 * ya no hay un componente padre que pueda pasarlo por props.
 */
export default function InformesShell({
  section,
  children,
}: {
  section: InformeSection;
  children: ReactNode;
}) {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <RefreshProvider value={refreshToken}>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#898781]">
              Informes
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold text-[#0b0b0b]">
              {section.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#52514e]">
              {section.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshToken((token) => token + 1)}
            className="h-9 shrink-0 cursor-pointer rounded-lg border border-black/15 bg-white px-3 text-sm font-medium text-[#0b0b0b] transition-colors hover:border-custom-green hover:text-custom-green"
          >
            Actualizar datos
          </button>
        </header>

        {children}
      </div>
    </RefreshProvider>
  );
}
