import { FaWhatsapp } from "react-icons/fa";
import { WHATSAPP_NUMBER, WHATSAPP_URL } from "@/utils/whatsapp";

export default function FloatingWhatsApp() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp ${WHATSAPP_NUMBER}`}
      className="fixed bottom-5 right-5 z-50 h-14 w-14 flex items-center justify-center rounded-full bg-[#25D366] shadow-lg hover:scale-105 hover:bg-[#1ebe57] transition-all duration-300"
    >
      <FaWhatsapp className="w-8 h-8 text-white" />
    </a>
  );
}
