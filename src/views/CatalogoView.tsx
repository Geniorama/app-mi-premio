"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import OfferCard from "@/components/OfferCard";
import Button from "@/utils/Button";
const offers = [
  {
    id: "1",
    image: "https://placehold.co/800x300/E85D04/white?text=VOUCHER",
    title: "Voucher de experiencia",
    handleClick: (id: string) => (window.location.href = `/catalogo/${id}`),
  },
  {
    id: "2",
    image: "https://placehold.co/800x300/E85D04/white?text=VOUCHER+2",
    title: "Oferta 2",
    handleClick: (id: string) => (window.location.href = `/catalogo/${id}`),
  },
  {
    id: "3",
    image: "https://placehold.co/800x300/E85D04/white?text=VOUCHER+3",
    title: "Oferta 3",
    handleClick: (id: string) => (window.location.href = `/catalogo/${id}`),
  },
];

export default function CatalogoView() {
  return (
    <div>
        <Hero />

        <section className="w-full bg-white p-12 lg:py-24">
            <Container>
                <div className="space-y-16">
                    {offers.map((offer) => (
                        <OfferCard
                          key={offer.id}
                          id={offer.id}
                          image={offer.image}
                          title={offer.title}
                          handleClick={() => offer.handleClick(offer.id)}
                        />
                    ))}

                    <Button onClick={() => {}} className="w-full mx-auto mt-4" variant="secondary">
                        Ver más
                    </Button>
                </div>
            </Container>
        </section>
    </div>
  )
}
