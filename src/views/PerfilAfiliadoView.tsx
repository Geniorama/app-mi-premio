"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import BgSnap2 from "@/img/bg-snap-2.svg";
import CarouselOffers from "@/components/CarouselOffers";
import Button from "@/utils/Button";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiCamera,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiHome,
  FiMapPin,
  FiCalendar,
} from "react-icons/fi";
import { urlFor, buildImageSet } from "@/sanity/image";
import type { PerfilPage, SanityImage, VoucherCard } from "@/sanity/types";

const VOUCHER_CARD_WIDTHS = [320, 480, 640, 800];
const PROFILE_IMAGE_WIDTHS = [320, 480, 640, 800];
const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_PLACEHOLDER = "https://placehold.co/400x400?text=Sin+foto";

interface UserSession {
  email: string;
  fullName: string;
  contactId: string;
}

interface Membership {
  id: string;
  puntos: number | null;
  categoria: string | null;
}

interface Contact {
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  empresa: string | null;
  ubicacion: string | null;
  fechaNacimiento: string | null;
  estadoFidelizacion: string | null;
}

interface PuntoAcumulado {
  puntosEntregados: number | null;
  puntosRedimidos: number | null;
  fechaVencimiento: string | null;
  estado: string | null;
}

const formatDate = (dateStr: string | null) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

interface PerfilAfiliadoViewProps {
  vouchers: VoucherCard[];
  page: PerfilPage | null;
}

const VOUCHER_PLACEHOLDER =
  "https://placehold.co/400x400/E85D04/white?text=VOUCHER";

export default function PerfilAfiliadoView({
  vouchers,
  page,
}: PerfilAfiliadoViewProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [puntosAcumulados, setPuntosAcumulados] = useState<PuntoAcumulado[]>([]);
  const [avatar, setAvatar] = useState<SanityImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/membership").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/avatar").then((r) => (r.ok ? r.json() : null)),
    ]).then(([meData, membershipData, avatarData]) => {
      if (meData?.user) setUser(meData.user);
      if (membershipData?.membership) setMembership(membershipData.membership);
      if (membershipData?.contact) setContact(membershipData.contact);
      if (membershipData?.puntosAcumulados)
        setPuntosAcumulados(membershipData.puntosAcumulados);
      if (avatarData?.avatar) setAvatar(avatarData.avatar);
      setLoading(false);
    });
  }, []);

  // Punto vigente (Aprobado / Parcial Aprobado) con saldo disponible cuyo
  // vencimiento es el más cercano. Solo mostramos ese.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diasHasta = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - hoy.getTime()) / 86_400_000);
  };
  const proximoAVencer = puntosAcumulados
    .filter((p) => p.estado === "Aprobado" || p.estado === "Parcial Aprobado")
    .map((p) => ({
      puntosVigentes: (p.puntosEntregados ?? 0) - (p.puntosRedimidos ?? 0),
      fechaVencimiento: p.fechaVencimiento,
      diasRestantes: diasHasta(p.fechaVencimiento),
    }))
    .filter(
      (p): p is typeof p & { diasRestantes: number } =>
        p.puntosVigentes > 0 && p.diasRestantes != null && p.diasRestantes >= 0
    )
    .sort((a, b) => a.diasRestantes - b.diasRestantes)[0] ?? null;
  const offers = vouchers.map((v) => {
    const imgSet = v.image ? buildImageSet(v.image, VOUCHER_CARD_WIDTHS) : null;
    return {
      id: v._id,
      image: imgSet?.src ?? VOUCHER_PLACEHOLDER,
      imageSrcSet: imgSet?.srcSet,
      title: v.title,
      price:
        v.pointsValue != null
          ? `${v.pointsValue.toLocaleString("es-CO")} puntos`
          : undefined,
      handleClick: () => router.push(`/catalogo/${v.slug}`),
    };
  });

  const heroSet = page?.hero?.image
    ? buildImageSet(page.hero.image, [320, 480, 640, 800])
    : null;
  const heroBg = page?.hero?.backgroundImage
    ? urlFor(page.hero.backgroundImage).width(1920).auto("format").url()
    : undefined;
  // La foto de perfil es siempre la del usuario (subida a Sanity). Si no hay,
  // se muestra un placeholder genérico.
  const profileSet = avatar ? buildImageSet(avatar, PROFILE_IMAGE_WIDTHS) : null;
  const profileImage = profileSet?.src ?? AVATAR_PLACEHOLDER;
  const suggested = page?.suggestedBlock;
  const suggestedSet = suggested?.image
    ? buildImageSet(suggested.image, [400, 600, 800, 1024, 1200])
    : null;
  const suggestedImage = suggestedSet?.src ?? "https://placehold.co/1920x1080";
  const loadMoreLabel = page?.carouselLoadMoreLabel;
  const welcomeMessage = page?.welcomeMessage;
  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;

    setAvatarError(null);
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      setAvatarError("Formato no permitido. Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > AVATAR_MAX_SIZE) {
      setAvatarError("La imagen supera el tamaño máximo de 5MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAvatarError(data?.error ?? "No se pudo subir la imagen.");
        return;
      }
      if (data?.avatar) setAvatar(data.avatar);
    } catch {
      setAvatarError("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const suggestedTitle = suggested?.title ?? "Elemento sugerido";
  const suggestedBody =
    suggested?.body ??
    "lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

  return (
    <div>
        <Hero
          title={page?.hero?.title}
          subtitle={page?.hero?.subtitle}
          description={page?.hero?.description}
          buttonText={page?.hero?.buttonText}
          image={heroSet?.src}
          imageSrcSet={heroSet?.srcSet}
          backgroundImage={heroBg}
          onClick={
            page?.hero?.buttonLink
              ? () => router.push(page.hero!.buttonLink!)
              : undefined
          }
        />
        <section className="w-full bg-white p-12 lg:py-24 flex-col items-center justify-center bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${BgSnap2.src})` }}>
            <Container>
                <div className="flex flex-col lg:flex-row items-center gap-10">
                    <div className="md:w-2/3 w-full text-center lg:pr-30">
                       {loading ? (
                         <div className="space-y-4 animate-pulse">
                           <div className="h-10 bg-slate-200 rounded w-2/3 mx-auto" />
                           <div className="h-10 bg-slate-200 rounded w-1/2 mx-auto" />
                           <div className="h-8 bg-slate-200 rounded w-1/3 mx-auto" />
                         </div>
                       ) : !membership ? (
                         <p className="text-2xl text-gray-400 font-medium">
                           Información no disponible
                         </p>
                       ) : (
                         <>
                           <h2 className="text-4xl font-bold mb-5 text-custom-green">
                             {user?.fullName ?? "—"}
                           </h2>
                           <h3 className="text-4xl font-bold mb-2 text-accent">
                             {membership.puntos != null
                               ? `${membership.puntos.toLocaleString("es-CO")} puntos`
                               : "— puntos"}
                           </h3>
                           {proximoAVencer && (
                             <p className="mb-5 text-lg font-medium text-amber-600">
                               {proximoAVencer.puntosVigentes.toLocaleString("es-CO")}{" "}
                               puntos próximos a vencer el{" "}
                               {formatDate(proximoAVencer.fechaVencimiento)}
                             </p>
                           )}
                           <p className="text-3xl">{membership.categoria ?? "—"}</p>

                           {contact && (
                             <ul className="mt-6 inline-block text-left space-y-2 text-gray-700">
                               {contact.email && (
                                 <li className="flex items-center gap-3">
                                   <FiMail className="shrink-0 text-custom-green" />
                                   <span className="break-all">{contact.email}</span>
                                 </li>
                               )}
                               {contact.telefono && (
                                 <li className="flex items-center gap-3">
                                   <FiPhone className="shrink-0 text-custom-green" />
                                   <span>{contact.telefono}</span>
                                 </li>
                               )}
                               {contact.cargo && (
                                 <li className="flex items-center gap-3">
                                   <FiBriefcase className="shrink-0 text-custom-green" />
                                   <span>{contact.cargo}</span>
                                 </li>
                               )}
                               {contact.empresa && (
                                 <li className="flex items-center gap-3">
                                   <FiHome className="shrink-0 text-custom-green" />
                                   <span>{contact.empresa}</span>
                                 </li>
                               )}
                               {contact.ubicacion && (
                                 <li className="flex items-center gap-3">
                                   <FiMapPin className="shrink-0 text-custom-green" />
                                   <span>{contact.ubicacion}</span>
                                 </li>
                               )}
                               {contact.fechaNacimiento && (
                                 <li className="flex items-center gap-3">
                                   <FiCalendar className="shrink-0 text-custom-green" />
                                   <span>{formatDate(contact.fechaNacimiento)}</span>
                                 </li>
                               )}
                             </ul>
                           )}
                         </>
                       )}

                       {welcomeMessage && (
                         <p className="mt-6 text-left whitespace-pre-line">
                           {welcomeMessage}
                         </p>
                       )}
                    </div>
                    <div className="md:w-1/3 w-full">
                       <div className="relative w-full">
                         <img
                           src={profileImage}
                           srcSet={profileSet?.srcSet}
                           sizes="(min-width: 1024px) 33vw, (min-width: 768px) 33vw, 100vw"
                           alt={avatar?.alt ?? user?.fullName ?? "Foto de perfil"}
                           loading="lazy"
                           decoding="async"
                           className={`w-full object-cover ${
                             avatar ? "h-full" : "aspect-square"
                           }`}
                         />
                         {uploading && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm font-medium">
                             Subiendo…
                           </div>
                         )}
                         <input
                           ref={fileInputRef}
                           type="file"
                           accept="image/jpeg,image/png,image/webp"
                           onChange={handleAvatarChange}
                           className="hidden"
                         />
                         <button
                           type="button"
                           onClick={() => fileInputRef.current?.click()}
                           disabled={uploading}
                           className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-custom-green text-white text-sm font-medium shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                         >
                           <FiCamera size={16} />
                           {avatar ? "Cambiar foto" : "Subir foto"}
                         </button>
                       </div>
                       {avatarError && (
                         <p className="mt-3 text-sm text-red-600 text-center">
                           {avatarError}
                         </p>
                       )}
                    </div>
                </div>
            </Container>
        </section>

        <section className="p-12 lg:py-24">
          <Container>
            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="md:w-1/2 w-full">
                <img
                  src={suggestedImage}
                  srcSet={suggestedSet?.srcSet}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  alt={suggestedTitle}
                  loading="lazy"
                  decoding="async"
                  className="w-full"
                />
              </div>
              <div className="md:w-1/2 w-full">
                <h2 className="text-4xl font-bold mb-5 text-custom-green">{suggestedTitle}</h2>
                <p className="whitespace-pre-line">{suggestedBody}</p>
              </div>
            </div>
          </Container>
        </section>

        <section className="p-12 lg:py-24">
            <Container>
                {offers.length === 0 ? (
                  <p className="text-center text-gray-400">
                    No hay vouchers disponibles por ahora.
                  </p>
                ) : (
                  <>
                    <CarouselOffers offers={offers} />
                    {loadMoreLabel && (
                      <Button
                        onClick={() => router.push("/catalogo")}
                        className="w-full mx-auto mt-4"
                        variant="secondary"
                      >
                        {loadMoreLabel}
                      </Button>
                    )}
                  </>
                )}
            </Container>
        </section>
    </div>
  )
}
