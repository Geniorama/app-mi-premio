"use client";
import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import { useEffect, useState } from "react";
import { FiTrendingUp, FiGift } from "react-icons/fi";

const PAGE_SIZE = 10;

interface PuntoAcumulado {
  id: string;
  numero: string | null;
  puntosEntregados: number | null;
  puntosRedimidos: number | null;
  fechaEntrega: string | null;
  fechaVencimiento: string | null;
  estado: string | null;
  entregaOC: string | null;
  redencionNo: string | null;
}

interface Redemption {
  id: string;
  numero: string | null;
  puntos: number | null;
  estado: string | null;
  fecha: string | null;
}

const formatDate = (dateStr: string | null) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const estadoBadge = (estado: string | null, colores: Record<string, string>) => {
  const cls = colores[estado ?? ""] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      {estado ?? "—"}
    </span>
  );
};

function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  // Ajusta la página si los datos cambian y la página actual queda fuera de rango
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paged = items.slice(start, start + PAGE_SIZE);

  return { paged, page: safePage, setPage, totalPages, total: items.length };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}

function Pagination({ page, totalPages, total, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>{start}–{end} de {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-lg rounded disabled:opacity-30 hover:bg-gray-200"
        >«</button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-lg rounded disabled:opacity-30 hover:bg-gray-200"
        >‹</button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | "…")[]>((acc, p, i, arr) => {
            if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-base">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p as number)}
                className={`px-3 py-1.5 text-base rounded ${
                  page === p
                    ? "bg-custom-green text-white font-bold"
                    : "hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            )
          )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-lg rounded disabled:opacity-30 hover:bg-gray-200"
        >›</button>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-lg rounded disabled:opacity-30 hover:bg-gray-200"
        >»</button>
      </div>
    </div>
  );
}

export default function ExtractosView() {
  const [puntosAcumulados, setPuntosAcumulados] = useState<PuntoAcumulado[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  const acumuladosPag = usePagination(puntosAcumulados);
  const redemcionesPag = usePagination(redemptions);

  useEffect(() => {
    fetch("/api/user/membership")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.puntosAcumulados) setPuntosAcumulados(data.puntosAcumulados);
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

          {/* Puntos Acumulados */}
          <h2 className="text-3xl font-bold mb-8 text-custom-green flex items-center gap-3">
            <FiTrendingUp className="shrink-0" />
            Puntos acumulados
          </h2>
          {loading ? (
            <div className="space-y-3 animate-pulse mb-16">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-white rounded-lg" />)}
            </div>
          ) : puntosAcumulados.length === 0 ? (
            <p className="text-gray-400 mb-16">No hay puntos acumulados registrados.</p>
          ) : (
            <div className="mb-16">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-500 uppercase text-xs">
                      <th className="py-3 pr-4">N°</th>
                      <th className="py-3 pr-4">OC</th>
                      <th className="py-3 pr-4">Puntos entregados</th>
                      <th className="py-3 pr-4">Fecha entrega</th>
                      <th className="py-3 pr-4">Vencimiento</th>
                      <th className="py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acumuladosPag.paged.map((p) => (
                      <tr key={p.id} className="border-b border-gray-200 hover:bg-white">
                        <td className="py-4 pr-4 font-medium">{p.numero ?? "—"}</td>
                        <td className="py-4 pr-4 text-gray-600 text-xs">{p.entregaOC ?? "—"}</td>
                        <td className="py-4 pr-4 font-bold text-custom-green">
                          {p.puntosEntregados != null ? p.puntosEntregados.toLocaleString("es-CO") : "—"}
                        </td>
                        <td className="py-4 pr-4 text-gray-600">{formatDate(p.fechaEntrega)}</td>
                        <td className="py-4 pr-4 text-gray-600">{formatDate(p.fechaVencimiento)}</td>
                        <td className="py-4">
                          {estadoBadge(p.estado, {
                            "Entregado": "bg-green-100 text-green-700",
                            "Cancelado": "bg-red-100 text-red-600",
                            "Aprobado": "bg-blue-100 text-blue-700",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={acumuladosPag.page}
                totalPages={acumuladosPag.totalPages}
                total={acumuladosPag.total}
                onPage={acumuladosPag.setPage}
              />
            </div>
          )}

          {/* Puntos Redimidos */}
          <h2 className="text-3xl font-bold mb-8 text-custom-green flex items-center gap-3">
            <FiGift className="shrink-0" />
            Puntos redimidos
          </h2>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-white rounded-lg" />)}
            </div>
          ) : redemptions.length === 0 ? (
            <p className="text-gray-400">No hay redenciones registradas.</p>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-500 uppercase text-xs">
                      <th className="py-3 pr-6">N°</th>
                      <th className="py-3 pr-6">Fecha</th>
                      <th className="py-3 pr-6">Puntos redimidos</th>
                      <th className="py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemcionesPag.paged.map((r) => (
                      <tr key={r.id} className="border-b border-gray-200 hover:bg-white">
                        <td className="py-4 pr-6 font-medium">{r.numero ?? "—"}</td>
                        <td className="py-4 pr-6 text-gray-600">{formatDate(r.fecha)}</td>
                        <td className="py-4 pr-6 font-bold text-accent">
                          {r.puntos != null ? r.puntos.toLocaleString("es-CO") : "—"}
                        </td>
                        <td className="py-4">
                          {estadoBadge(r.estado, {
                            "Procesada": "bg-green-100 text-green-700",
                            "Pendiente": "bg-yellow-100 text-yellow-700",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={redemcionesPag.page}
                totalPages={redemcionesPag.totalPages}
                total={redemcionesPag.total}
                onPage={redemcionesPag.setPage}
              />
            </div>
          )}

        </Container>
      </section>
    </div>
  );
}
