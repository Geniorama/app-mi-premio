"use client";

import Container from "@/utils/Container";
import Logo from "@/img/logo-mi-premio.svg";
import imgSnap from "@/img/bg-snap-photos.svg";
import Button from "@/utils/Button";
import { useState, useEffect } from "react";
import iconFacebook from "@/img/facebook-fill.svg";
import iconInstagram from "@/img/instagram-fill.svg";
import iconLinkedin from "@/img/linkedin-fill.svg";
import iconYoutube from "@/img/youtube-fill.svg";
import Link from "next/link";

export default function LoginView() {
  const [isMobile, setIsMobile] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        setMessage({ type: "error", text: data.error || "Error al enviar el c\u00f3digo" });
        return;
      }

      setMessage({ type: "success", text: data.message });
      setStep("code");
    } catch {
      setMessage({ type: "error", text: "Error de conexi\u00f3n. Intenta de nuevo." });
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
        setMessage({ type: "error", text: data.error || "C\u00f3digo inv\u00e1lido" });
        return;
      }

      window.location.href = data.redirect || "/perfil";
    } catch {
      setMessage({ type: "error", text: "Error de conexi\u00f3n. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  const socialMedia = [
    {
      label: "Facebook",
      href: "#",
      target: "_blank",
      icon: iconFacebook,
    },
    {
      label: "Instagram",
      href: "#",
      target: "_blank",
      icon: iconInstagram,
    },
    {
      label: "Linkedin",
      href: "#",
      target: "_blank",
      icon: iconLinkedin,
    },
    {
      label: "Youtube",
      href: "#",
      target: "_blank",
      icon: iconYoutube,
    },
  ];

  return (
    <div
      className="w-full min-h-screen bg-[#F6F6F6] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: !isMobile ? `url(${imgSnap.src})` : undefined,
      }}
    >
      <Container>
        <div className="text-center p-12 flex flex-col items-center justify-center h-screen">
          <h1 className="text-4xl font-normal text-custom-green">Login</h1>
          <p className="text-lg mt-4">Bienvenido a nuestra plataforma</p>

          <div className="shadow-lg p-12 border border-slate-700 mt-12 bg-white max-w-4xl w-full">
            <img src={Logo.src} alt="Logo" className="w-26 mx-auto" />
            <h2 className="text-2xl font-bold my-3">{"Inicia sesi\u00f3n"}</h2>

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
              <form onSubmit={handleSendCode} className="max-w-xl mx-auto">
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
                  className="w-fit! mx-auto mt-12 whitespace-nowrap"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar código"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode}>
                <p className="text-sm text-gray-600 mb-2">
                  {"C\u00f3digo enviado a "}
                  <strong>{email}</strong>
                </p>
                <input
                  name="code"
                  placeholder="C\u00f3digo de 6 d\u00edgitos"
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
