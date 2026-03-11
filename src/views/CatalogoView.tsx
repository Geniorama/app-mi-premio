"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import OfferCard from "@/components/OfferCard";
import Button from "@/utils/Button";

const offers = [
  {
    image: "https://placehold.co/400x400",
    handleClick: () => {
      console.log("click");
    },
  },
  {
    image: "https://placehold.co/400x400",
    handleClick: () => {
      console.log("click");
    },
    title: "Oferta 2",
  },
  {
    image: "https://placehold.co/400x400",
    handleClick: () => {
      console.log("click");
    },
    title: "Oferta 3",
  },
  
];

export default function CatalogoView() {
  return (
    <div>
        <Hero />

        <section className="w-full bg-white p-12 lg:py-24">
            <Container>
                <div className="space-y-16">
                    {offers.map((offer, index) => (
                        <OfferCard key={index} image={offer.image} handleClick={offer.handleClick} />
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
