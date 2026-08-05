"use client";

import { useEffect, useState } from "react";

interface PreviewState {
  fullName: string;
  email: string;
  previewedBy?: string;
}

/**
 * Aviso permanente cuando un administrador está viendo el sitio como un
 * afiliado. Deja claro de quién es la vista y que no se puede actuar.
 *
 * Es solo señalización: el bloqueo real de escrituras está en el servidor
 * (`lib/viewer.ts`), no en que esta barra se muestre.
 */
export default function PreviewBanner() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.preview) return;
        setPreview({
          fullName: data.user?.fullName ?? data.user?.email ?? "",
          email: data.user?.email ?? "",
          previewedBy: data.preview.previewedBy,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!preview) return null;

  const exit = async () => {
    setLeaving(true);
    try {
      await fetch("/api/admin/preview", { method: "DELETE" });
    } finally {
      window.location.href = "/admin/informes/afiliados";
    }
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent px-4 py-2 text-center text-sm text-white"
    >
      <span>
        <strong className="font-semibold">Modo previsualización</strong>
        {" · estás viendo el sitio como "}
        <strong className="font-semibold">{preview.fullName}</strong>
        {preview.email && (
          <span className="opacity-90"> ({preview.email})</span>
        )}
      </span>
      <span className="opacity-90">Solo lectura: no puedes redimir ni editar.</span>
      <button
        type="button"
        onClick={exit}
        disabled={leaving}
        className="cursor-pointer rounded-md border border-white/60 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-white/15 disabled:opacity-60"
      >
        {leaving ? "Saliendo…" : "Salir de la previsualización"}
      </button>
    </div>
  );
}
