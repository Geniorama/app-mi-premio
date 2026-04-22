"use client";
import Hero from "@/components/Hero";
import Container from "@/utils/Container";
import { useEffect, useState } from "react";
import { FiTrendingUp, FiGift, FiStar, FiMinusCircle, FiX, FiFileText } from "react-icons/fi";
import { MdHotel } from "react-icons/md";

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

/**
 * Extrae el nombre del hotel del string Entrega_OC.
 * Formato observado: "ME211_Mercure bh Zona Financiera_CRM - 000 - 699191"
 * Hotel = segmento entre el primer "_" y "_CRM".
 * Si no matchea, devuelve el string completo (fallback visible para el editor).
 */
const extractHotelName = (entregaOC: string | null): string | null => {
  if (!entregaOC) return null;
  const match = entregaOC.match(/^[^_]+_(.+?)_CRM/);
  return match ? match[1].trim() : entregaOC;
};

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
  const [saldoPuntos, setSaldoPuntos] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [filtroAcumulados, setFiltroAcumulados] = useState<string | null>(null);
  const [filtroRedimidos, setFiltroRedimidos] = useState<string | null>(null);

  const acumuladosFiltrados = filtroAcumulados
    ? puntosAcumulados.filter((p) => p.estado === filtroAcumulados)
    : puntosAcumulados;
  const redimidosFiltrados = filtroRedimidos
    ? redemptions.filter((r) => r.estado === filtroRedimidos)
    : redemptions;

  const acumuladosPag = usePagination(acumuladosFiltrados);
  const redemcionesPag = usePagination(redimidosFiltrados);

  const toggleFiltro = (
    current: string | null,
    value: string,
    setter: (v: string | null) => void
  ) => setter(current === value ? null : value);

  useEffect(() => {
    fetch("/api/user/membership")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.puntosAcumulados) setPuntosAcumulados(data.puntosAcumulados);
        if (data?.redemptions) setRedemptions(data.redemptions);
        if (data?.membership?.puntos != null) setSaldoPuntos(data.membership.puntos);
        setLoading(false);
      });
  }, []);

  const puntosPorHotel = puntosAcumulados.reduce<
    Record<string, { puntos: number; registros: number }>
  >((acc, p) => {
    const hotel = extractHotelName(p.entregaOC) ?? "Sin hotel";
    if (!acc[hotel]) acc[hotel] = { puntos: 0, registros: 0 };
    acc[hotel].puntos += p.puntosEntregados ?? 0;
    acc[hotel].registros += 1;
    return acc;
  }, {});
  const hotelesOrdenados = Object.entries(puntosPorHotel).sort(
    (a, b) => b[1].puntos - a[1].puntos
  );

  const totalRedimidos = redemptions.reduce(
    (acc, r) => acc + (r.puntos ?? 0),
    0
  );

  return (
    <div>
      <Hero
        title="Extractos"
        description="Aquí puedes ver tu historial de redenciones de puntos."
        buttonText="Ver extractos"
        onClick={() => {}}
      />

      <section className="bg-slate-900 text-white p-6 lg:p-12 lg:py-24">
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


      <section className="bg-slate-100 p-6 lg:p-12 lg:py-24 ">
        <Container>
          {/* Resumen: saldo total + total redimidos */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm flex items-center gap-4">
              <span className="shrink-0 w-12 h-12 rounded-full bg-custom-green/10 text-custom-green flex items-center justify-center">
                <FiStar size={22} />
              </span>
              <div>
                <p className="text-xs uppercase text-gray-500 tracking-wide">
                  Total disponibles
                </p>
                {loading ? (
                  <div className="h-9 w-28 bg-gray-200 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-custom-green">
                    {saldoPuntos != null
                      ? saldoPuntos.toLocaleString("es-CO")
                      : "—"}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm flex items-center gap-4">
              <span className="shrink-0 w-12 h-12 rounded-full bg-[#E85D04]/10 text-[#E85D04] flex items-center justify-center">
                <FiMinusCircle size={22} />
              </span>
              <div>
                <p className="text-xs uppercase text-gray-500 tracking-wide">
                  Total redimidos
                </p>
                {loading ? (
                  <div className="h-9 w-28 bg-gray-200 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-[#E85D04]">
                    {totalRedimidos.toLocaleString("es-CO")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Puntos por hotel: card ancho con grid interno responsive y scroll */}
          <div className="mb-6 lg:mb-16 bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="shrink-0 w-10 h-10 rounded-full bg-[#E85D04]/10 text-[#E85D04] flex items-center justify-center">
                <MdHotel size={20} />
              </span>
              <h3 className="text-lg font-bold text-custom-green">
                Puntos acumulados por hotel
                {!loading && hotelesOrdenados.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({hotelesOrdenados.length})
                  </span>
                )}
              </h3>
            </div>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded" />
                ))}
              </div>
            ) : hotelesOrdenados.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aún no tienes puntos asociados a un hotel.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-y-3 max-h-96 overflow-y-auto pr-2">
                {hotelesOrdenados.map(([hotel, info]) => (
                  <li
                    key={hotel}
                    className="flex items-center justify-between gap-3 py-2 text-sm border-b border-gray-100 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate" title={hotel}>
                        {hotel}
                      </p>
                      <p className="text-xs text-gray-500">
                        {info.registros} OC{info.registros !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-custom-green whitespace-nowrap">
                      {info.puntos.toLocaleString("es-CO")} pts
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Botón para abrir el detalle */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setDetalleOpen(true)}
              disabled={loading}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-custom-green text-white font-bold shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <FiFileText size={18} />
              Ver detalle de extractos
            </button>
          </div>

        </Container>
      </section>

      {detalleOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detalle-extractos-title"
          onClick={() => setDetalleOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <h2
                id="detalle-extractos-title"
                className="text-2xl font-bold text-custom-green"
              >
                Detalle de extractos
              </h2>
              <button
                type="button"
                onClick={() => setDetalleOpen(false)}
                className="text-gray-500 hover:text-gray-800 cursor-pointer"
                aria-label="Cerrar"
              >
                <FiX size={22} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-12">
              {/* Puntos Acumulados */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-custom-green flex items-center gap-3">
                  <FiTrendingUp className="shrink-0" />
                  Puntos acumulados
                </h3>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-xs text-gray-600">
                  {[
                    { estado: "Aprobado", desc: "Disponibles para redimir", cls: "bg-green-100 text-green-700" },
                    { estado: "Entregado", desc: "Ya consumidos en redenciones", cls: "bg-orange-100 text-orange-700" },
                    { estado: "Cancelado", desc: "Anulados y no disponibles", cls: "bg-red-100 text-red-600" },
                  ].map(({ estado, desc, cls }) => {
                    const active = filtroAcumulados === estado;
                    const otherActive = filtroAcumulados !== null && !active;
                    return (
                      <button
                        key={estado}
                        type="button"
                        onClick={() =>
                          toggleFiltro(filtroAcumulados, estado, setFiltroAcumulados)
                        }
                        aria-pressed={active}
                        className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                          otherActive ? "opacity-40 hover:opacity-80" : ""
                        }`}
                      >
                        <span
                          className={`px-2 py-1 rounded-full font-medium ${cls} ${
                            active ? "ring-2 ring-offset-1 ring-custom-green" : ""
                          }`}
                        >
                          {estado}
                        </span>
                        <span>{desc}</span>
                      </button>
                    );
                  })}
                  {filtroAcumulados && (
                    <button
                      type="button"
                      onClick={() => setFiltroAcumulados(null)}
                      className="text-gray-500 underline cursor-pointer hover:text-custom-green"
                    >
                      Limpiar filtro
                    </button>
                  )}
                </div>
                {puntosAcumulados.length === 0 ? (
                  <p className="text-gray-400">No hay puntos acumulados registrados.</p>
                ) : acumuladosFiltrados.length === 0 ? (
                  <p className="text-gray-400">
                    No hay puntos acumulados con estado &quot;{filtroAcumulados}&quot;.
                  </p>
                ) : (
                  <>
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
                            <tr key={p.id} className="border-b border-gray-200 hover:bg-slate-50">
                              <td className="py-4 pr-4 font-medium">{p.numero ?? "—"}</td>
                              <td className="py-4 pr-4 text-gray-600 text-xs">{p.entregaOC ?? "—"}</td>
                              <td className="py-4 pr-4 font-bold text-custom-green">
                                {p.puntosEntregados != null ? p.puntosEntregados.toLocaleString("es-CO") : "—"}
                              </td>
                              <td className="py-4 pr-4 text-gray-600">{formatDate(p.fechaEntrega)}</td>
                              <td className="py-4 pr-4 text-gray-600">{formatDate(p.fechaVencimiento)}</td>
                              <td className="py-4">
                                {estadoBadge(p.estado, {
                                  "Entregado": "bg-orange-100 text-orange-700",
                                  "Cancelado": "bg-red-100 text-red-600",
                                  "Aprobado": "bg-green-100 text-green-700",
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
                  </>
                )}
              </div>

              {/* Puntos Redimidos */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-custom-green flex items-center gap-3">
                  <FiGift className="shrink-0" />
                  Puntos redimidos
                </h3>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-xs text-gray-600">
                  {[
                    { estado: "Pendiente", desc: "Redención en curso", cls: "bg-yellow-100 text-yellow-700" },
                    { estado: "Procesada", desc: "Redención completada", cls: "bg-green-100 text-green-700" },
                  ].map(({ estado, desc, cls }) => {
                    const active = filtroRedimidos === estado;
                    const otherActive = filtroRedimidos !== null && !active;
                    return (
                      <button
                        key={estado}
                        type="button"
                        onClick={() =>
                          toggleFiltro(filtroRedimidos, estado, setFiltroRedimidos)
                        }
                        aria-pressed={active}
                        className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                          otherActive ? "opacity-40 hover:opacity-80" : ""
                        }`}
                      >
                        <span
                          className={`px-2 py-1 rounded-full font-medium ${cls} ${
                            active ? "ring-2 ring-offset-1 ring-custom-green" : ""
                          }`}
                        >
                          {estado}
                        </span>
                        <span>{desc}</span>
                      </button>
                    );
                  })}
                  {filtroRedimidos && (
                    <button
                      type="button"
                      onClick={() => setFiltroRedimidos(null)}
                      className="text-gray-500 underline cursor-pointer hover:text-custom-green"
                    >
                      Limpiar filtro
                    </button>
                  )}
                </div>
                {redemptions.length === 0 ? (
                  <p className="text-gray-400">No hay redenciones registradas.</p>
                ) : redimidosFiltrados.length === 0 ? (
                  <p className="text-gray-400">
                    No hay redenciones con estado &quot;{filtroRedimidos}&quot;.
                  </p>
                ) : (
                  <>
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
                            <tr key={r.id} className="border-b border-gray-200 hover:bg-slate-50">
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
