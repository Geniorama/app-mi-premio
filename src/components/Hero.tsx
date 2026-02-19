import Button from "@/utils/Button"
import bgIntro from "@/img/bg-intro.webp"
import imgAcumula from "@/img/acumula-puntos.webp"

export default function Hero() {
  return (
    <section className="w-full bg-fixed bg-cover bg-center bg-no-repeat p-6 lg:p-12 flex-col text-center items-center justify-center text-white" style={{ backgroundImage: `url(${bgIntro.src})` }}>
        {/* <img src={bgIntro.src} alt="bg-intro" /> */}
        <div>
            <img className="w-full max-w-lg mx-auto" src={imgAcumula.src} alt="img-acumula" />
        </div>
        <div>
            <h3 className="text-3xl lg:text-5xl font-bold mb-5">¡Tus acciones ahora valen más!</h3>
            <h5 className="text-lg lg:text-xl font-bold">Acumula puntos conviértelos en premios increíbles.</h5>
            <p className="text-sm lg:text-base mt-4 lg:mt-6"> Mientras más participes, más ganas: canjea tus puntos por productos, descuentos o experiencias exclusivas.</p>

            <Button className="w-full mx-auto mt-4">Login</Button>
        </div>
    </section>
  )
}
