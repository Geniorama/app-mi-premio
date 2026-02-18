"use client";

import Button from "@/utils/Button";
import bgIntro from "@/img/bg-intro.webp";
import imgAcumula from "@/img/acumula-puntos.webp";
import imgSnap from "@/img/bg-snap-photos.svg";
import star1 from "@/img/star-1.svg";
import Container from "@/utils/Container";
import imageExample from "@/img/image-example.webp";
import {useEffect, useState} from "react";
import Hero from "@/components/Hero";


export default function HomeView() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);

    // on load
    handleResize();
    console.log( "isMobile", isMobile);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  const itemList = [
    {
      title: "Sed ut perspiciatis",
      description: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est.",
      icon: star1.src,
      target: "https://www.google.com",
    },

    {
      title: "Sed ut perspiciatis",
      description: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est.",
      icon: star1.src,
      target: "https://www.google.com",
    },

    {
      title: "Sed ut perspiciatis",
      description: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est.",
      icon: star1.src,
      target: "https://www.google.com",
    },
    {
      title: "Sed ut perspiciatis",
      description: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est.",
      icon: star1.src,
      target: "https://www.google.com",
    },
  ];

  const renderItemList = itemList.map((item, index) => (
    <div className="md:w-1/3 w-full" key={index}>
      <div className="flex items-center gap-2">
        <img src={item.icon} alt={item.title} />
        <h3 className="text-custom-green font-bold text-2xl">{item.title}</h3>
      </div>
      <p className="text-black text-md">{item.description}</p>
      <Button className="w-full mt-4" variant="tertiary" onClick={() => window.open(item.target, "_blank")}>Leer más</Button>
    </div>
  ));

  return (
    <div className="w-full text-white">
        <Hero />

        <section className="w-full bg-[#F6F6F6] p-12 lg:py-24 flex-col text-center items-center justify-center bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${!isMobile && imgSnap.src})` }}>
            <Container>
                <h2 className="text-4xl font-bold mb-5 text-custom-green uppercase">Snap photos and share <br />  like never before</h2>
                <div className="flex justify-between gap-x-120 gap-y-10 text-left flex-wrap mt-16">
                    {renderItemList}
                </div>
            </Container>
        </section>

        <section className="w-full bg-white p-12 lg:py-24 flex-col items-center justify-center">
            <Container>
               <div className="flex flex-col lg:flex-row items-center gap-10">
                 <div className="md:w-1/2 w-full">
                    <img src={imageExample.src} alt="image-example" />
                 </div>
                 <div className="md:w-1/2 w-full">
                    <h3 className="text-2xl font-bold mb-5 text-custom-green">Sed ut perspiciatis unde omnis</h3>
                    <p className="text-black text-md">Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem.</p>
                    <Button className="w-full mt-6" variant="secondary">Leer más</Button>
                 </div>
               </div>
            </Container>
        </section>
    </div>
  )
}
