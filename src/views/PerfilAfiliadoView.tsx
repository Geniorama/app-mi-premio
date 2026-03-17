"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import BgSnap2 from "@/img/bg-snap-2.svg";
import CarouselOffers from "@/components/CarouselOffers";
import Button from "@/utils/Button";
import { useEffect, useState } from "react";

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

export default function PerfilAfiliadoView() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/membership").then((r) => (r.ok ? r.json() : null)),
    ]).then(([meData, membershipData]) => {
      if (meData?.user) setUser(meData.user);
      if (membershipData?.membership) setMembership(membershipData.membership);
      setLoading(false);
    });
  }, []);
  const offers = [
    {
      id: "1",
      image: "https://placehold.co/400x400",
      title: "Title",
      price: "$100 COP",
      handleClick: () => {
        console.log("click");
      },
    },
    {
      id: "2",
      image: "https://placehold.co/400x400",
      title: "Title",
      price: "$100 COP",
      handleClick: () => {
        console.log("click");
      },
    },
    {
      id: "3",
      image: "https://placehold.co/400x400",
      title: "Title",
      price: "$100 COP",
      handleClick: () => {
        console.log("click");
      },
    },
    {
      id: "4",
      image: "https://placehold.co/400x400",
      title: "Title",
      price: "$100 COP",
      handleClick: () => {
        console.log("click");
      },
    },
    {
      id: "5",
      image: "https://placehold.co/400x400",
      title: "Title",
      price: "$100 COP",
      handleClick: () => {
        console.log("click");
      },
    },
  ];  
  return (
    <div>
        <Hero />
        <section className="w-full bg-white p-12 lg:py-24 flex-col items-center justify-center bg-cover min-h-screen bg-center bg-no-repeat" style={{ backgroundImage: `url(${BgSnap2.src})` }}>
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
                           <h3 className="text-4xl font-bold mb-5 text-accent">
                             {membership.puntos != null
                               ? `${membership.puntos.toLocaleString("es-CO")} puntos`
                               : "— puntos"}
                           </h3>
                           <p className="text-3xl">{membership.categoria ?? "—"}</p>
                         </>
                       )}

                       <p className="mt-6 text-left">lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                    </div>
                    <div className="md:w-1/3 w-full">
                       <img src="https://placehold.co/400x600" alt="image-example" className="w-full h-full object-cover" />
                    </div>
                </div>
            </Container>
        </section>

        <section className="p-12 lg:py-24">
          <Container>
            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="md:w-1/2 w-full">
                <img src="https://placehold.co/1920x1080" alt="image-example" className="w-full" />
              </div>
              <div className="md:w-1/2 w-full">
                <h2 className="text-4xl font-bold mb-5 text-custom-green">Elemento  sugerido</h2>
                <p>lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
              </div>
            </div>
          </Container>
        </section>

        <section className="p-12 lg:py-24">
            <Container>
                <CarouselOffers offers={offers} />
                <Button onClick={() => {}} className="w-full mx-auto mt-4" variant="secondary">
                  Ver más
                </Button>
            </Container>
        </section>
    </div>
  )
}
