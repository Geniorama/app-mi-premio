"use client";

import { useState } from "react";
import Logo from "@/img/logo-mi-premio.svg";

/**
 * Acceso al panel. Mismo mecanismo que el de afiliados (código de un solo
 * uso al correo), pero valida contra los administradores de Sanity y emite
 * una cookie de sesión distinta y de menor duración.
 */
export default function AdminLoginView({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleSendCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error ?? "No se pudo enviar el código" });
        return;
      }

      setMessage({ type: "success", text: data.message });
      setStep("code");
    } catch {
      setMessage({ type: "error", text: "Error de conexión. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error ?? "Código inválido" });
        return;
      }

      window.location.href = next || data.redirect || "/admin/informes";
    } catch {
      setMessage({ type: "error", text: "Error de conexión. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f6] px-4">
      <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-8 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={Logo.src} alt="Mi Premio" className="mx-auto w-24" />

        <h1 className="mt-6 text-center text-xl font-semibold text-[#0b0b0b]">
          Panel administrativo
        </h1>
        <p className="mt-1 text-center text-sm text-[#52514e]">
          Acceso restringido al equipo de Mi Premio.
        </p>

        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`mt-5 rounded-lg px-3 py-2 text-sm ${
              message.type === "error"
                ? "bg-[#d03b3b]/10 text-[#d03b3b]"
                : "bg-custom-green/10 text-custom-green"
            }`}
          >
            {message.text}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="mt-6 flex flex-col gap-3">
            <label htmlFor="admin-email" className="text-xs font-medium text-[#52514e]">
              Correo electrónico
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="tucorreo@empresa.com"
              className="h-11 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-custom-green"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 cursor-pointer rounded-lg bg-custom-green text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Enviando…" : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="mt-6 flex flex-col gap-3">
            <p className="text-sm text-[#52514e]">
              Si el correo <strong className="text-[#0b0b0b]">{email}</strong> tiene
              acceso, recibirás un código de 6 dígitos.
            </p>
            <input
              id="admin-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              required
              autoComplete="one-time-code"
              aria-label="Código de 6 dígitos"
              className="h-12 rounded-lg border border-black/15 px-3 text-center text-xl tracking-[0.4em] outline-none focus:border-custom-green"
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="h-11 cursor-pointer rounded-lg bg-custom-green text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Verificando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setMessage(null);
              }}
              className="cursor-pointer text-xs text-custom-green hover:underline"
            >
              Usar otro correo
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
