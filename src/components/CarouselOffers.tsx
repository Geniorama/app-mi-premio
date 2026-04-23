"use client";

import type { CSSProperties } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";


export interface Offer {
  id: string;
  image: string;
  title: string;
  price?: string;
  handleClick?: () => void;
}

export default function CarouselOffers({ offers }: { offers: Offer[] }) {
  const handleClick = (offer: Offer) => {
    offer.handleClick?.();
  };
  return (
    <Swiper
      modules={[Navigation, Pagination]}
      spaceBetween={50}
      loop
      navigation
      pagination={{ clickable: true }}
      className="lg:p-12! [&_.swiper-pagination]:hidden [&_.swiper-pagination]:md:block"
      style={{
        "--swiper-navigation-color": "#417D30",
        "--swiper-pagination-color": "#417D30",
      } as CSSProperties}
      breakpoints={{
        0: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 2,
        },
        1024: {
          slidesPerView: 4,
        },
      }}
    >
      {offers.map((offer, index) => (
        <SwiperSlide key={index} className="overflow-hidden py-6 px-4">
            <div
              className="text-center space-y-2 cursor-pointer transition-transform duration-300 hover:scale-110 origin-center"
              onClick={() => handleClick(offer)}
            >
                <img src={offer.image} alt={offer.title} className="w-full" />
                <h3 className="text-xl font-bold">{offer.title}</h3>
                <span className="font-bold text-xl">{offer.price}</span>
            </div>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
