"use client"

import Container from "@/utils/Container";
import Button from "@/utils/Button";
import { useRouter } from "next/navigation";

export default function GraciasView() {
  const router = useRouter();

  return (
    <div className="w-full bg-slate-100">
        <Container>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-10 py-24 px-6">
                <div className="lg:w-1/2 space-y-6">
                    <h1 className="text-4xl font-bold text-custom-green">¡Gracias!</h1>
                    <p>lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</p>
                    <Button variant="secondary" onClick={() => router.push("/")}>Volver al inicio</Button>
                </div>
                <div className="lg:w-1/2">
                    <img src="https://placehold.co/800x600/" />
                </div>
            </div>
        </Container>
    </div>
  )
}
