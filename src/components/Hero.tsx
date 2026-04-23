import Button from "@/utils/Button"
import bgIntro from "@/img/bg-intro.webp"
import imgAcumula from "@/img/acumula-puntos.webp"

interface HeroProps {
    title?: string;
    description?: string;
    subtitle?: string;
    buttonText?: string;
    onClick?: () => void;
    image?: string;
    backgroundImage?: string;
}

export default function Hero({
    title,
    description,
    buttonText,
    onClick,
    image,
    subtitle,
    backgroundImage,
}: HeroProps) {
  const bgUrl = backgroundImage || bgIntro.src
  return (
    <section className="w-full bg-fixed bg-cover bg-center bg-no-repeat p-6 lg:p-12 flex-col text-center items-center justify-center text-white" style={{ backgroundImage: `url(${bgUrl})` }}>
        <div>
            <img className="w-full max-w-lg mx-auto" src={ image || imgAcumula.src } alt="img-acumula" />
        </div>
        <div>
            <h3 className="text-3xl lg:text-5xl font-bold mb-5">{ title || "¡Tus acciones ahora valen más!" }</h3>
            <h5 className="text-lg lg:text-xl font-bold">{ subtitle || "Acumula puntos conviértelos en premios increíbles." }</h5>
            <p className="text-sm lg:text-base mt-4 lg:mt-6">{ description || "Mientras más participes, más ganas: canjea tus puntos por productos, descuentos o experiencias exclusivas." }</p>

            {buttonText && (
              <Button className="w-full mx-auto mt-4" onClick={onClick || (() => {})}>{buttonText}</Button>
            )}
        </div>
    </section>
  )
}
