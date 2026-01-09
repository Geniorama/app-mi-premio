"use client";

import Button from "@/utils/Button";
import bgIntro from "@/img/bg-intro.webp";
import imgAcumula from "@/img/acumula-puntos.webp";
import imgSnap from "@/img/bg-snap-photos.svg";
import star1 from "@/img/star-1.svg";
import Container from "@/utils/Container";
import imageExample from "@/img/image-example.webp";


export default function HomeView() {
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
        <section className="w-full bg-fixed bg-cover bg-center bg-no-repeat p-12 flex-col text-center items-center justify-center" style={{ backgroundImage: `url(${bgIntro.src})` }}>
            {/* <img src={bgIntro.src} alt="bg-intro" /> */}
            <div>
                <img className="w-full max-w-lg mx-auto" src={imgAcumula.src} alt="img-acumula" />
            </div>
            <div>
                <h3 className="text-5xl font-bold mb-5">¡Tus acciones ahora valen más!</h3>
                <h5 className="text-xl font-bold">Acumula puntos conviértelos en premios increíbles.</h5>
                <p> Mientras más participes, más ganas: canjea tus puntos por productos, descuentos o experiencias exclusivas.</p>

                <Button className="w-full mx-auto mt-4">Login</Button>
            </div>
        </section>

        <section className="w-full bg-[#F6F6F6] p-12 py-24 flex-col text-center items-center justify-center bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${imgSnap.src})` }}>
            <Container>
                <h2 className="text-4xl font-bold mb-5 text-custom-green uppercase">Snap photos and share <br />  like never before</h2>
                <div className="flex justify-between gap-x-120 gap-y-10 text-left flex-wrap mt-16">
                    {renderItemList}
                </div>
            </Container>
        </section>

        <section className="w-full bg-white p-12 py-24 flex-col items-center justify-center">
            <Container>
               <div className="flex items-center gap-10">
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
