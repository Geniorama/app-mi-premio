import type { Metadata } from "next";
import RegistroView from "@/views/RegistroView";

export const metadata: Metadata = {
  title: "Registro fidelización",
  description: "Formulario de registro al programa de fidelización.",
};

export default function RegistroPage() {
  return <RegistroView />;
}
