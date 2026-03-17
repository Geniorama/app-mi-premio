"use client";

import Container from "@/utils/Container";
import Logo from "@/img/logo-mi-premio.svg";
import Button from "@/utils/Button";
import { useState } from "react";

export default function LoginView() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Error al enviar el código" });
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

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Código inválido" });
        return;
      }

      window.location.href = data.redirect || "/perfil";
    } catch {
      setMessage({ type: "error", text: "Error de conexión. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-100">
      <Container>
        <div className="text-center p-12 flex flex-col items-center justify-center h-screen">
          <h1 className="text-4xl font-medium text-custom-green">Login</h1>
          <p className="text-lg">Bienvenido a nuestra plataforma</p>

          <div className="shadow-lg p-12 rounded-lg mt-12 bg-white max-w-md w-full">
            <img src={Logo.src} alt="Logo" className="w-20 mx-auto" />
            <h2 className="text-2xl font-bold my-3">Inicia sesión</h2>

            {message && (
              <div
                className={`p-3 rounded-lg mb-4 text-sm ${
                  message.type === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {message.text}
              </div>
            )}

            {step === "email" ? (
              <form onSubmit={handleSendCode}>
                <input
                  name="email"
                  placeholder="Correo electrónico"
                  className="w-full p-2 rounded-lg border border-gray-300"
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full! mt-4 whitespace-nowrap"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar código de verificación"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode}>
                <p className="text-sm text-gray-600 mb-2">
                  Código enviado a <strong>{email}</strong>
                </p>
                <input
                  name="code"
                  placeholder="Código de 6 dígitos"
                  className="w-full p-2 rounded-lg border border-gray-300 text-center text-xl tracking-widest"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoComplete="one-time-code"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full! mt-4 whitespace-nowrap"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? "Verificando..." : "Verificar e iniciar sesión"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setMessage(null);
                  }}
                  className="text-sm text-custom-green mt-3 hover:underline"
                >
                  Usar otro correo
                </button>
              </form>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
