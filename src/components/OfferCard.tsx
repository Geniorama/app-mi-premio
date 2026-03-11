import Button from '@/utils/Button';

export interface OfferCardProps {
  id?: string;
  image: string;
  title?: string;
  buttonText?: string;
  handleClick: () => void;
}

export default function OfferCard({ image, title, buttonText, handleClick }: OfferCardProps) {
  return (
    <div className="w-full bg-white shadow-md relative overflow-hidden aspect-[5/2]">
      <img src={image} alt={title || "Oferta Mi Premio"} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 flex justify-end w-full p-16">
        <Button onClick={handleClick} className='h-20 px-24' variant="secondary">{buttonText || "Redimir"}</Button>
      </div>
    </div>
  )
}
