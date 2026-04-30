import Button from '@/utils/Button';

export interface OfferCardProps {
  id?: string;
  image: string;
  imageSrcSet?: string;
  imageSizes?: string;
  title?: string;
  buttonText?: string;
  handleClick: () => void;
}

export default function OfferCard({ image, imageSrcSet, imageSizes, title, buttonText, handleClick }: OfferCardProps) {
  return (
    <div className="w-full bg-white shadow-md rounded-lg sm:rounded-none relative overflow-hidden">
      <img
        src={image}
        srcSet={imageSrcSet}
        sizes={imageSizes ?? "(min-width: 1024px) 1280px, (min-width: 640px) 100vw, 100vw"}
        alt={title || "Oferta Mi Premio"}
        loading="lazy"
        decoding="async"
        className="w-full h-auto object-cover"
      />
      <div className="p-4 sm:p-0 sm:absolute sm:bottom-0 sm:left-0 sm:flex sm:justify-end sm:w-full sm:p-6 md:p-10 lg:p-16">
        <Button
          onClick={handleClick}
          className="!w-full sm:!w-auto !h-12 sm:!h-14 lg:!h-20 px-6 sm:px-10 lg:px-24 text-sm sm:text-base"
          variant="secondary"
        >
          {buttonText || "Redimir"}
        </Button>
      </div>
    </div>
  )
}
