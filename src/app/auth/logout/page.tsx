"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      window.location.href = "/";
    });
  }, []);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <p className="text-lg text-custom-green font-medium">Cerrando sesión...</p>
    </div>
  );
}
