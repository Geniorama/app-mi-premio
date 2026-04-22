"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import Button from "@/utils/Button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FiFileText,
  FiDollarSign,
  FiAward,
  FiClock,
  FiCheck,
} from "react-icons/fi";
import Link from "next/link";
import { PortableText } from "@portabletext/react";
import { urlFor } from "@/sanity/image";
import type { Voucher } from "@/sanity/types";

interface DetailItemProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function DetailItem({ icon, title, children }: DetailItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-6 h-6 text-[#DC2626] rounded inline-flex items-center justify-center">
          {icon}
        </span>
        <div>
          <h4 className="font-bold text-custom-green text-base">{title}</h4>
          <div className="text-sm text-gray-600 mt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDER_IMAGE = "https://placehold.co/1200x360/D94D1C/ffffff?text=+";

const formatValidUntil = (dateStr?: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date
    .toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    .toUpperCase();
};

const formatCOP = (value?: number) =>
  value != null ? `$${value.toLocaleString("es-CO")} COP` : undefined;

interface SessionUser {
  email: string;
  fullName: string;
  contactId: string;
}

interface MembershipInfo {
  puntos: number | null;
  categoria: string | null;
}

export default function VoucherDetailView({ voucher }: { voucher: Voucher }) {
  const router = useRouter();
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaPoliticas, setAceptaPoliticas] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setUser(data?.user ?? null);
        setIsLoggedIn(!!data?.user);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    setMembershipLoading(true);
    fetch("/api/user/membership")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.membership) {
          setMembership({
            puntos: data.membership.puntos ?? null,
            categoria: data.membership.categoria ?? null,
          });
        }
        if (data?.fullName) setFullName(data.fullName);
      })
      .catch(() => setMembership(null))
      .finally(() => setMembershipLoading(false));
  }, [isLoggedIn]);

  const requiredPoints = voucher.pointsValue ?? 0;
  const userPoints = membership?.puntos ?? null;
  const insufficientPoints =
    isLoggedIn === true &&
    userPoints !== null &&
    requiredPoints > 0 &&
    userPoints < requiredPoints;

  const canRedeem =
    isLoggedIn === true &&
    aceptaTerminos &&
    aceptaPoliticas &&
    !redeeming &&
    !insufficientPoints;

  const handleRedeem = async () => {
    if (!canRedeem) return;
    setRedeeming(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherSlug: voucher.slug,
          termsAcceptedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "No se pudo completar la redención",
        });
        return;
      }
      setFeedback({
        type: "success",
        message: `¡Redención creada! N° ${data.zohoRedemptionId}. Saldo restante: ${data.newBalance} puntos.`,
      });
      setTimeout(() => router.push("/gracias"), 1500);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: "Error de conexión. Intenta de nuevo.",
      });
    } finally {
      setRedeeming(false);
    }
  };

  const voucherImage = voucher.image
    ? urlFor(voucher.image).width(1600).url()
    : PLACEHOLDER_IMAGE;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div>
      <Hero
        buttonText={isLoggedIn ? "Salida segura" : "Iniciar sesión"}
        onClick={
          isLoggedIn
            ? logout
            : () => {
                window.location.href = "/auth/login";
              }
        }
      />

      <section className="w-full bg-white py-10 lg:py-14">
        <Container>
          <div className="relative w-full overflow-hidden mb-10">
            <img
              src={voucherImage}
              alt={voucher.title}
              className="w-full h-auto object-contain"
            />
            {voucher.validUntil && (
              <span className="absolute top-4 left-4 text-white text-xs font-medium bg-black/30 px-2 py-1 rounded">
                VÁLIDO HASTA {formatValidUntil(voucher.validUntil)}
              </span>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-10 lg:gap-26 mt-10 lg:mt-22">
            <div className="lg:w-2/3 space-y-8">
              {voucher.terms && voucher.terms.length > 0 && (
                <DetailItem
                  icon={<FiFileText size={18} />}
                  title="Términos & condiciones"
                >
                  <PortableText value={voucher.terms} />
                </DetailItem>
              )}
              <DetailItem icon={<FiDollarSign size={18} />} title="Precio en COP">
                {formatCOP(voucher.priceCOP) ?? "Consultar"}
              </DetailItem>
              <DetailItem icon={<FiAward size={18} />} title="Valor en puntos">
                {voucher.pointsValue != null
                  ? `${voucher.pointsValue.toLocaleString("es-CO")} puntos`
                  : "Consultar"}
              </DetailItem>
              <DetailItem icon={<FiClock size={18} />} title="Tiempo de entrega">
                {voucher.deliveryTime ?? "24-48 horas"}
              </DetailItem>

              {insufficientPoints && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  No tienes puntos suficientes para redimir este voucher.
                  Necesitas{" "}
                  <strong>{requiredPoints.toLocaleString("es-CO")}</strong>{" "}
                  puntos y tu saldo actual es{" "}
                  <strong>{(userPoints ?? 0).toLocaleString("es-CO")}</strong>.
                </div>
              )}

              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <span
                    onClick={() => setAceptaTerminos(!aceptaTerminos)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      aceptaTerminos
                        ? "bg-[#417D30] border-[#417D30]"
                        : "border-gray-400"
                    }`}
                  >
                    {aceptaTerminos && <FiCheck className="text-white" size={12} />}
                  </span>
                  <span className="text-lg text-black font-bold">
                    Acepto{" "}
                    <Link
                      href="/terminos-y-condiciones"
                      className="underline hover:text-custom-green"
                    >
                      términos y condiciones
                    </Link>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <span
                    onClick={() => setAceptaPoliticas(!aceptaPoliticas)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      aceptaPoliticas
                        ? "bg-[#417D30] border-[#417D30]"
                        : "border-gray-400"
                    }`}
                  >
                    {aceptaPoliticas && <FiCheck className="text-white" size={12} />}
                  </span>
                  <span className="text-lg text-black font-bold">
                    Acepto{" "}
                    <Link
                      href="/politicas-de-privacidad"
                      className="underline hover:text-custom-green"
                    >
                      políticas de privacidad
                    </Link>
                  </span>
                </label>
              </div>
            </div>

            <div className="lg:w-1/3 lg:min-w-[240px]">
              <div className="flex flex-col items-center lg:items-center text-center space-y-3 lg:sticky lg:top-4">
                <div className="w-full aspect-[1/1] overflow-hidden bg-gray-300 shrink-0">
                  <img
                    src="https://placehold.co/80x80/4b5563/white?text=U"
                    alt="Usuario"
                    className="w-full h-full object-cover grayscale"
                  />
                </div>

                {isLoggedIn === null ? (
                  <>
                    <div className="h-9 w-3/4 rounded bg-gray-200 animate-pulse" />
                    <div className="h-10 w-1/2 rounded bg-gray-200 animate-pulse" />
                    <div className="h-7 w-1/3 rounded bg-gray-200 animate-pulse" />
                  </>
                ) : (
                  <>
                    {membershipLoading && fullName === null ? (
                      <div className="h-9 w-3/4 rounded bg-gray-200 animate-pulse" />
                    ) : (
                      <p className="font-bold text-[#417D30] text-3xl">
                        {fullName ?? user?.fullName ?? "Invitado"}
                      </p>
                    )}

                    {membershipLoading ? (
                      <div className="h-10 w-1/2 rounded bg-gray-200 animate-pulse" />
                    ) : (
                      <p className="text-4xl font-bold text-[#E85D04]">
                        {membership?.puntos != null
                          ? `${membership.puntos.toLocaleString("es-CO")} puntos`
                          : "— puntos"}
                      </p>
                    )}

                    {membershipLoading ? (
                      <div className="h-7 w-1/3 rounded bg-gray-200 animate-pulse" />
                    ) : (
                      <p className="text-2xl text-gray-500">
                        {membership?.categoria ?? ""}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 mt-12 pt-8 justify-center">
            <Button
              variant="tertiary"
              className="h-18 !bg-[#69BF50] text-white lg:min-w-[200px]"
              onClick={() => router.push("/catalogo")}
            >
              Volver
            </Button>

            {isLoggedIn === false ? (
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = "/auth/login";
                }}
                className="sm:w-[160px] h-18 lg:min-w-[200px]"
              >
                Iniciar sesión
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={handleRedeem}
                disabled={!canRedeem}
                className="sm:w-[160px] h-18 disabled:opacity-50 disabled:cursor-not-allowed lg:min-w-[200px]"
              >
                {redeeming ? "Procesando..." : "Redimir"}
              </Button>
            )}
          </div>

          {feedback && (
            <div
              className={`mt-6 max-w-xl mx-auto p-4 rounded-lg text-sm ${
                feedback.type === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {feedback.message}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
