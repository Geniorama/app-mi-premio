"use client";
import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import { useEffect, useState } from "react";

interface Redemption {
  id: string;
  numero: string | null;
  puntos: number | null;
  estado: string | null;
  fecha: string | null;
}

export default function ExtractosView() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/membership")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.redemptions) setRedemptions(data.redemptions);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <Hero
        title="Extractos"
        description="Aquí puedes ver tu historial de redenciones de puntos."
        buttonText="Ver extractos"
        onClick={() => {}}
      />

      <section className="bg-slate-900 text-white p-12 lg:py-24">
        <Container>
          <div className="flex flex-col lg:flex-row gap-10 items-center">
            <div className="lg:w-1/3 space-y-4">
              <h2 className="text-2xl font-bold">Mensaje de motivación</h2>
              <p className="text-sm text-slate-100">
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem.
              </p>
            </div>
            <div className="lg:w-2/3">
              <div className="w-full h-full bg-slate-800 rounded-lg">
                <img className="w-full" src="https://placehold.co/600x400" alt="Extractos" />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white p-12 lg:py-24">
        <Container>
          <div className="flex flex-col lg:flex-row gap-10 items-center">
            <div className="lg:w-1/2 space-y-4">
              <h2 className="text-2xl font-bold text-custom-green">Title</h2>
              <p className="text-sm">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.
              </p>
            </div>
            <div className="lg:w-1/2 space-y-4">
              <h2 className="text-2xl font-bold text-custom-green">Title</h2>
              <p className="text-sm">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-slate-100 p-12 lg:py-24">
        <Container>
          <h2 className="text-3xl font-bold mb-8 text-custom-green">
            Historial de redenciones
          </h2>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : redemptions.length === 0 ? (
            <p className="text-gray-400">No hay redenciones registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase text-xs">
                    <th className="py-3 pr-6">N°</th>
                    <th className="py-3 pr-6">Fecha</th>
                    <th className="py-3 pr-6">Puntos redimidos</th>
                    <th className="py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 hover:bg-slate-50"
                    >
                      <td className="py-4 pr-6 font-medium">{r.numero ?? "—"}</td>
                      <td className="py-4 pr-6 text-gray-600">
                        {r.fecha
                          ? new Date(r.fecha).toLocaleDateString("es-CO", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-4 pr-6 font-bold text-accent">
                        {r.puntos != null
                          ? r.puntos.toLocaleString("es-CO")
                          : "—"}
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            r.estado === "Procesada"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {r.estado ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
