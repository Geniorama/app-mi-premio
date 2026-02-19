"use client";

import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import BgSnap2 from "@/img/bg-snap-2.svg";
import CarouselOffers from "@/components/CarouselOffers";

export default function PerfilAfiliadoView() {
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
                       <h2 className="text-4xl font-bold mb-5 text-custom-green">User Name Profile</h2>
                       <h3 className="text-4xl font-bold mb-5 text-accent">7000 puntos</h3>
                       <p className="text-3xl">Categoría</p>

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
            </Container>
        </section>
    </div>
  )
}
