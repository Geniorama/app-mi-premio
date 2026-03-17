"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import Button from "@/utils/Button";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FiFileText,
  FiDollarSign,
  FiAward,
  FiClock,
  FiCheck,
} from "react-icons/fi";
import Link from "next/link";

interface VoucherItem {
  id: string;
  image: string;
  title: string;
  validUntil?: string;
  terms?: string;
  priceCOP?: string;
  pointsValue?: string;
  deliveryTime?: string;
}

// Datos de ejemplo - en producción vendrían de API
const VOUCHERS: Record<string, VoucherItem> = {
  "1": {
    id: "1",
    image: "",
    title: "Voucher de experiencia",
    validUntil: "DICIEMBRE 2025",
    terms:
      "Este voucher es canjeable por una experiencia exclusiva. Las condiciones varían según el proveedor. No aplica para devolución de efectivo.",
    priceCOP: "$150.000 COP",
    pointsValue: "7.000 puntos",
    deliveryTime: "Entrega inmediata por correo electrónico",
  },
  "2": {
    id: "2",
    image: "",
    title: "Oferta 2",
    validUntil: "ENERO 2026",
  },
  "3": {
    id: "3",
    image: "",
    title: "Oferta 3",
  },
};

const defaultVoucher: VoucherItem = {
  id: "1",
  image: "",
  title: "Voucher",
  validUntil: "DICIEMBRE 2025",
  terms:
    "Este voucher es canjeable según los términos del proveedor. No aplica para devolución de efectivo.",
  priceCOP: "$150.000 COP",
  pointsValue: "7.000 puntos",
  deliveryTime: "Entrega inmediata por correo electrónico",
};

const PLACEHOLDER_IMAGE = "https://placehold.co/1200x360/D94D1C/ffffff?text=+";

interface DetailItemProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function DetailItem({ icon, title, children }: DetailItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-6 h-6 bg-[#DC2626] rounded inline-flex items-center justify-center text-white">
          {icon}
        </span>
        <div>
          <h4 className="font-bold text-custom-green text-base">{title}</h4>
          <p className="text-sm text-gray-600 mt-1">{children}</p>
        </div>
      </div>
    </div>
  );
}

export default function VoucherDetailView() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "1";
  const voucher = VOUCHERS[id] || defaultVoucher;

  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaPoliticas, setAceptaPoliticas] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIsLoggedIn(!!data?.user));
  }, []);

  const canRedeem = isLoggedIn === true && aceptaTerminos && aceptaPoliticas;

  const voucherImage = voucher.image || PLACEHOLDER_IMAGE;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div>
      <Hero
        buttonText={isLoggedIn ? "Salida segura" : "Iniciar sesión"}
        onClick={isLoggedIn ? logout : () => { window.location.href = "/auth/login"; }}
      />

      <section className="w-full bg-white py-10 lg:py-14">
        <Container>
          {/* Imagen del voucher - solo placeholder, sin overlays */}
          <div className="relative w-full aspect-[4/1] overflow-hidden mb-10">
            <img
              src={voucherImage}
              alt={voucher.title}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-4 left-4 text-white text-xs font-medium bg-black/30 px-2 py-1 rounded">
              VÁLIDO HASTA {voucher.validUntil || "DICIEMBRE 2025"}
            </span>
          </div>

          {/* Dos columnas: detalles (2/3) + perfil (1/3) */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-26 mt-10 lg:mt-22">
            {/* Columna izquierda - Detalles (~2/3) */}
            <div className="lg:w-2/3 space-y-8">
              <DetailItem
                icon={<FiFileText size={16} />}
                title="Términos & condiciones"
              >
                {voucher.terms}
              </DetailItem>
              <DetailItem
                icon={<FiDollarSign size={16} />}
                title="Precio en COP"
              >
                {voucher.priceCOP || "Consultar"}
              </DetailItem>
              <DetailItem
                icon={<FiAward size={16} />}
                title="Valor en puntos"
              >
                {voucher.pointsValue || "Consultar"}
              </DetailItem>
              <DetailItem
                icon={<FiClock size={16} />}
                title="Tiempo de entrega"
              >
                {voucher.deliveryTime || "24-48 horas"}
              </DetailItem>

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
                  <span className="text-lg text-black font-bold">Acepto <Link href="/terminos-y-condiciones" className="underline hover:text-custom-green">términos y condiciones</Link>
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
                  <span className="text-lg text-black font-bold">Acepto <Link href="/politicas-de-privacidad" className="underline hover:text-custom-green">políticas de privacidad</Link></span>
                </label>
              </div>
            </div>

            {/* Columna derecha - Perfil usuario (~1/3) */}
            <div className="lg:w-1/3 lg:min-w-[240px]">
              <div className="flex flex-col items-center lg:items-center text-center space-y-3 lg:sticky lg:top-4">
                <div className="w-full aspect-[1/1] overflow-hidden bg-gray-300 shrink-0">
                  <img
                    src="https://placehold.co/80x80/4b5563/white?text=U"
                    alt="Usuario"
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
                <p className="font-bold text-[#417D30] text-3xl">User Name profile</p>
                <p className="text-4xl font-bold text-[#E85D04]">7000 points</p>
                <p className="text-2xl text-gray-500">Category</p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-6 mt-12 pt-8 justify-center">
            <Button
              variant="tertiary"
              className=""
              onClick={() => router.push("/catalogo")}
            >
              Volver
            </Button>
            
            {isLoggedIn === false ? (
              <Button
                variant="secondary"
                onClick={() => { window.location.href = "/auth/login"; }}
                className="sm:w-[160px]"
              >
                Iniciar sesión
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => canRedeem && console.log("Canjear")}
                disabled={!canRedeem}
                className="sm:w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Redimir
              </Button>
            )}
            
          </div>
        </Container>
      </section>
    </div>
  );
}
