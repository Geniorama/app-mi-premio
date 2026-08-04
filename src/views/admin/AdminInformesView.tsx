"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StatTile,
  Panel,
  DataTable,
  StatusPill,
  statusLabel,
  Field,
  ExportButton,
  Spinner,
  ErrorNote,
  formatNumber,
  formatDate,
  formatDateTime,
  inputClass,
  type Column,
} from "@/components/admin/ui";
import { ColumnChart, OrdinalBarList } from "@/components/admin/charts";

// ---------------------------------------------------------------------- tipos

interface Totals {
  afiliados: number;
  afiliadosConSaldo: number;
  membresias: number;
  puntosEntregados: number;
  saldoDisponible: number;
  puntosRedimidos: number;
  puntosVencidos: number;
  puntosPorVencer: number;
  redenciones: number;
  redencionesPorEstado: Record<string, number>;
  puntosPorEstado: Record<string, number>;
}

interface OverviewData {
  totals: Totals;
  serieMensual: Array<{ mes: string; redenciones: number; puntos: number }>;
  topAfiliados: Array<{
    nombre: string;
    email: string;
    puntosRedimidos: number;
    redenciones: number;
  }>;
  topBonos: Array<{ bono: string; canjes: number; puntos: number }>;
  cobertura: { redencionesZoho: number; redencionesAuditadas: number };
  generadoEn: string;
}

interface RedemptionRow {
  id: string;
  nombre: string;
  afiliado: string;
  email: string;
  membresia: string;
  puntos: number;
  estado: string;
  estadoRaw: string;
  fecha: string | null;
  bono: string;
  bonoSlug: string;
  categoria: string;
  estadoEntrega: string;
  correoEntrega: string;
  procesadaEn: string | null;
  origenWeb: boolean;
}

interface RedemptionsData {
  rows: RedemptionRow[];
  resumen: {
    redenciones: number;
    puntos: number;
    porEstado: Record<string, number>;
    desdeWeb: number;
  };
}

interface AffiliateRow {
  rootId: string;
  email: string;
  nombre: string;
  empresa: string;
  membresiaNo: string;
  tipoAfiliado: string;
  estadoFidelizacion: string;
  puntosEntregados: number;
  saldoDisponible: number;
  puntosRedimidos: number;
  puntosVencidos: number;
  puntosPorVencer: number;
  ciclos: number;
  redenciones: number;
  ultimaRedencion: string | null;
  ultimaActividad: string | null;
}

interface AffiliatesData {
  rows: AffiliateRow[];
  resumen: {
    afiliados: number;
    puntosEntregados: number;
    puntosRedimidos: number;
    saldoDisponible: number;
  };
  tipos: string[];
}

interface ExpiringRow {
  rootId: string;
  membershipId: string;
  membershipName: string;
  email: string;
  nombre: string;
  puntosEntregados: number;
  puntosRedimidos: number;
  saldoLote: number;
  fechaEntrega: string | null;
  fechaVencimiento: string | null;
  estado: string;
  diasParaVencer: number | null;
}

interface ExpiringData {
  rows: ExpiringRow[];
  ventanas: Array<{
    clave: string;
    etiqueta: string;
    lotes: number;
    puntos: number;
    afiliados: number;
  }>;
  resumen: { lotes: number; puntos: number; afiliados: number; dias: number };
}

type TabKey = "resumen" | "redenciones" | "afiliados" | "por-vencer";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "resumen", label: "Resumen" },
  { key: "redenciones", label: "Redenciones" },
  { key: "afiliados", label: "Afiliados" },
  { key: "por-vencer", label: "Puntos por vencer" },
];

const MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function monthLabels(month: string) {
  const [year, monthIndex] = month.split("-");
  const short = MONTH_LABELS[Number(monthIndex) - 1] ?? month;
  return {
    short,
    full: `${short.charAt(0).toUpperCase()}${short.slice(1)} ${year}`,
  };
}

/** Fetch con manejo uniforme de error y 401 */
async function fetchReport<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (response.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Sesión expirada");
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? "Error al cargar el informe");
  return data as T;
}

// ----------------------------------------------------------------- componente

export default function AdminInformesView() {
  const [tab, setTab] = useState<TabKey>("resumen");
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b0b0b]">Informes</h1>
          <p className="mt-1 text-sm text-[#52514e]">
            Puntos y redenciones del programa. Datos en vivo de Zoho CRM,
            enriquecidos con la auditoría de la web.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshToken((token) => token + 1)}
          className="h-9 cursor-pointer rounded-lg border border-black/15 bg-white px-3 text-sm font-medium text-[#0b0b0b] transition-colors hover:border-custom-green hover:text-custom-green"
        >
          Actualizar datos
        </button>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-black/10">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-current={tab === item.key ? "page" : undefined}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm transition-colors ${
              tab === item.key
                ? "border-custom-green font-semibold text-custom-green"
                : "border-transparent text-[#52514e] hover:text-[#0b0b0b]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "resumen" && <ResumenTab refreshToken={refreshToken} />}
      {tab === "redenciones" && <RedencionesTab refreshToken={refreshToken} />}
      {tab === "afiliados" && <AfiliadosTab refreshToken={refreshToken} />}
      {tab === "por-vencer" && <PorVencerTab refreshToken={refreshToken} />}
    </div>
  );
}

/** Carga un informe y reexpone estado de carga/error. */
function useReport<T>(url: string, refreshToken: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Evita que una respuesta lenta pise a una petición más reciente
  const requestId = useRef(0);

  const load = useCallback(
    async (force: boolean) => {
      const current = ++requestId.current;
      setLoading(true);
      setError(null);

      try {
        const separator = url.includes("?") ? "&" : "?";
        const result = await fetchReport<T>(
          force ? `${url}${separator}refresh=1` : url
        );
        if (current === requestId.current) setData(result);
      } catch (caught) {
        if (current === requestId.current) {
          setError(caught instanceof Error ? caught.message : "Error inesperado");
        }
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    load(refreshToken > 0);
    // `refreshToken` fuerza relectura saltándose la caché del servidor
  }, [load, refreshToken]);

  return { data, loading, error };
}

// ------------------------------------------------------------------- resumen

function ResumenTab({ refreshToken }: { refreshToken: number }) {
  const { data, loading, error } = useReport<OverviewData>(
    "/api/admin/reports/overview",
    refreshToken
  );

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  const { totals } = data;
  const estados = Object.entries(totals.redencionesPorEstado).sort(
    (a, b) => b[1] - a[1]
  );

  const puntos = data.serieMensual.map((point) => {
    const { short, full } = monthLabels(point.mes);
    return {
      label: short,
      fullLabel: full,
      value: point.puntos,
      secondary: point.redenciones,
      secondaryLabel: point.redenciones === 1 ? "redención" : "redenciones",
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Puntos entregados"
          value={totals.puntosEntregados}
          hint="Acumulado histórico del programa"
        />
        <StatTile
          label="Puntos redimidos"
          value={totals.puntosRedimidos}
          hint={`${formatNumber(totals.redenciones)} redenciones`}
          tone="accent"
        />
        <StatTile
          label="Saldo en circulación"
          value={totals.saldoDisponible}
          hint={`${formatNumber(totals.afiliadosConSaldo)} afiliados con saldo`}
        />
        <StatTile
          label="Puntos vencidos"
          value={totals.puntosVencidos}
          hint="Ya no son redimibles"
          tone="critical"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Afiliados" value={totals.afiliados} hint="Redes de membresía" />
        <StatTile label="Membresías" value={totals.membresias} hint="Padre + ciclos hija" />
        <StatTile label="Puntos por vencer" value={totals.puntosPorVencer} />
        <StatTile
          label="Redenciones desde la web"
          value={`${formatNumber(data.cobertura.redencionesAuditadas)} / ${formatNumber(data.cobertura.redencionesZoho)}`}
          hint="El resto se creó directamente en el CRM"
        />
      </div>

      <Panel
        title="Puntos redimidos por mes"
        description="Últimos 12 meses. Pasa el cursor sobre una columna para ver el detalle."
      >
        <ColumnChart points={puntos} valueLabel="puntos redimidos" />
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title="Redenciones por estado"
          description="Estado actual en Zoho CRM"
        >
          <DataTable
            rows={estados}
            rowKey={([estado]) => estado}
            columns={[
              {
                key: "estado",
                header: "Estado",
                render: ([estado]) => <StatusPill status={estado} />,
              },
              {
                key: "cantidad",
                header: "Redenciones",
                numeric: true,
                render: ([, cantidad]) => formatNumber(cantidad),
              },
              {
                key: "puntos",
                header: "Puntos",
                numeric: true,
                render: ([estado]) =>
                  formatNumber(totals.puntosPorEstado[estado] ?? 0),
              },
            ]}
          />
        </Panel>

        <Panel
          title="Bonos más canjeados"
          description="Solo redenciones hechas desde la web"
        >
          <DataTable
            rows={data.topBonos}
            rowKey={(row) => row.bono}
            emptyMessage="Aún no hay redenciones registradas desde la web."
            columns={[
              { key: "bono", header: "Bono", render: (row) => row.bono },
              {
                key: "canjes",
                header: "Canjes",
                numeric: true,
                render: (row) => formatNumber(row.canjes),
              },
              {
                key: "puntos",
                header: "Puntos",
                numeric: true,
                render: (row) => formatNumber(row.puntos),
              },
            ]}
          />
        </Panel>
      </div>

      <Panel
        title="Afiliados con más puntos redimidos"
        description="Top 10 del programa"
      >
        <DataTable
          rows={data.topAfiliados}
          rowKey={(row) => row.email || row.nombre}
          emptyMessage="Todavía no hay redenciones."
          columns={[
            {
              key: "nombre",
              header: "Afiliado",
              render: (row) => (
                <div>
                  <p className="font-medium text-[#0b0b0b]">{row.nombre}</p>
                  <p className="text-xs text-[#52514e]">{row.email}</p>
                </div>
              ),
            },
            {
              key: "redenciones",
              header: "Redenciones",
              numeric: true,
              render: (row) => formatNumber(row.redenciones),
            },
            {
              key: "puntos",
              header: "Puntos redimidos",
              numeric: true,
              render: (row) => formatNumber(row.puntosRedimidos),
            },
          ]}
        />
      </Panel>

      <p className="text-xs text-[#898781]">
        Informe generado el {formatDateTime(data.generadoEn)}.
      </p>
    </div>
  );
}

// --------------------------------------------------------------- redenciones

function RedencionesTab({ refreshToken }: { refreshToken: number }) {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    estado: "",
    origen: "",
    q: "",
  });
  const [search, setSearch] = useState("");

  // La búsqueda se aplica con retardo para no consultar en cada tecla
  useEffect(() => {
    const timer = setTimeout(
      () => setFilters((current) => ({ ...current, q: search })),
      400
    );
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [filters]);

  const { data, loading, error } = useReport<RedemptionsData>(
    `/api/admin/reports/redemptions${query ? `?${query}` : ""}`,
    refreshToken
  );

  const columns: Column<RedemptionRow>[] = [
    {
      key: "nombre",
      header: "Redención",
      render: (row) => (
        <div>
          <p className="font-medium text-[#0b0b0b]">{row.nombre}</p>
          <p className="text-xs text-[#52514e]">
            {row.origenWeb ? "Web" : "CRM"}
          </p>
        </div>
      ),
    },
    { key: "fecha", header: "Fecha", render: (row) => formatDate(row.fecha) },
    {
      key: "afiliado",
      header: "Afiliado",
      render: (row) => (
        <div>
          <p className="text-[#0b0b0b]">{row.afiliado || "—"}</p>
          <p className="text-xs text-[#52514e]">{row.email}</p>
        </div>
      ),
    },
    {
      key: "bono",
      header: "Bono",
      render: (row) =>
        row.bono ? (
          <span>{row.bono}</span>
        ) : (
          <span className="text-[#898781]">No registrado</span>
        ),
    },
    {
      key: "puntos",
      header: "Puntos",
      numeric: true,
      render: (row) => formatNumber(row.puntos),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <StatusPill status={row.estado} />,
    },
    {
      key: "entrega",
      header: "Entrega",
      render: (row) =>
        row.estadoEntrega ? (
          <span className="text-[#0b0b0b]">{statusLabel(row.estadoEntrega)}</span>
        ) : (
          <span className="text-[#898781]">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Filtros"
        actions={
          <ExportButton
            href={`/api/admin/reports/redemptions?${query}${query ? "&" : ""}format=csv`}
          />
        }
      >
        <div className="flex flex-wrap gap-3">
          <Field label="Desde">
            <input
              type="date"
              className={inputClass}
              value={filters.from}
              onChange={(event) =>
                setFilters({ ...filters, from: event.target.value })
              }
            />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              className={inputClass}
              value={filters.to}
              onChange={(event) =>
                setFilters({ ...filters, to: event.target.value })
              }
            />
          </Field>
          <Field label="Estado">
            <select
              className={inputClass}
              value={filters.estado}
              onChange={(event) =>
                setFilters({ ...filters, estado: event.target.value })
              }
            >
              <option value="">Todos</option>
              {["pendiente", "procesada", "entregada", "cancelada", "rechazada"].map(
                (estado) => (
                  <option key={estado} value={estado}>
                    {statusLabel(estado)}
                  </option>
                )
              )}
            </select>
          </Field>
          <Field label="Origen">
            <select
              className={inputClass}
              value={filters.origen}
              onChange={(event) =>
                setFilters({ ...filters, origen: event.target.value })
              }
            >
              <option value="">Todos</option>
              <option value="web">Desde la web</option>
              <option value="crm">Desde el CRM</option>
            </select>
          </Field>
          <Field label="Buscar">
            <input
              type="search"
              placeholder="Afiliado, correo o bono"
              className={`${inputClass} min-w-56`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
        </div>
      </Panel>

      {error && <ErrorNote message={error} />}
      {loading && !data && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Redenciones" value={data.resumen.redenciones} />
            <StatTile label="Puntos redimidos" value={data.resumen.puntos} tone="accent" />
            <StatTile
              label="Originadas en la web"
              value={data.resumen.desdeWeb}
              hint="El resto se creó en el CRM"
            />
          </div>

          <Panel
            title="Detalle de redenciones"
            description={`${formatNumber(data.rows.length)} registros`}
          >
            <DataTable
              columns={columns}
              rows={data.rows}
              rowKey={(row) => row.id}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ afiliados

function AfiliadosTab({ refreshToken }: { refreshToken: number }) {
  const [search, setSearch] = useState("");
  const [query_, setQuery] = useState("");
  const [tipo, setTipo] = useState("");
  const [conSaldo, setConSaldo] = useState(false);
  const [sort, setSort] = useState("puntosEntregados");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (query_) params.set("q", query_);
    if (tipo) params.set("tipo", tipo);
    if (conSaldo) params.set("conSaldo", "1");
    params.set("sort", sort);
    params.set("dir", direction);
    return params.toString();
  }, [query_, tipo, conSaldo, sort, direction]);

  const { data, loading, error } = useReport<AffiliatesData>(
    `/api/admin/reports/affiliates?${query}`,
    refreshToken
  );

  const handleSort = (key: string) => {
    if (key === sort) {
      setDirection(direction === "asc" ? "desc" : "asc");
      return;
    }
    setSort(key);
    setDirection("desc");
  };

  const columns: Column<AffiliateRow>[] = [
    {
      key: "nombre",
      header: "Afiliado",
      sortKey: "nombre",
      render: (row) => (
        <div className="max-w-64">
          <p className="truncate font-medium text-[#0b0b0b]">
            {row.nombre || "Sin nombre"}
          </p>
          <p className="truncate text-xs text-[#52514e]">{row.email || "Sin correo"}</p>
        </div>
      ),
    },
    { key: "membresiaNo", header: "Membresía", render: (row) => row.membresiaNo || "—" },
    {
      key: "tipoAfiliado",
      header: "Tipo",
      render: (row) => row.tipoAfiliado || "—",
    },
    {
      key: "puntosEntregados",
      header: "Entregados",
      numeric: true,
      sortKey: "puntosEntregados",
      render: (row) => formatNumber(row.puntosEntregados),
    },
    {
      key: "puntosRedimidos",
      header: "Redimidos",
      numeric: true,
      sortKey: "puntosRedimidos",
      render: (row) => formatNumber(row.puntosRedimidos),
    },
    {
      key: "saldoDisponible",
      header: "Saldo",
      numeric: true,
      sortKey: "saldoDisponible",
      render: (row) => (
        <span className="font-semibold text-custom-green">
          {formatNumber(row.saldoDisponible)}
        </span>
      ),
    },
    {
      key: "puntosVencidos",
      header: "Vencidos",
      numeric: true,
      sortKey: "puntosVencidos",
      render: (row) => formatNumber(row.puntosVencidos),
    },
    {
      key: "redenciones",
      header: "Redenciones",
      numeric: true,
      sortKey: "redenciones",
      render: (row) => formatNumber(row.redenciones),
    },
    {
      key: "ultimaRedencion",
      header: "Última redención",
      render: (row) => formatDate(row.ultimaRedencion),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Filtros"
        actions={<ExportButton href={`/api/admin/reports/affiliates?${query}&format=csv`} />}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Buscar">
            <input
              type="search"
              placeholder="Nombre, correo o No. de membresía"
              className={`${inputClass} min-w-64`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Tipo de afiliado">
            <select
              className={inputClass}
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
            >
              <option value="">Todos</option>
              {(data?.tipos ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-[#52514e]">
            <input
              type="checkbox"
              checked={conSaldo}
              onChange={(event) => setConSaldo(event.target.checked)}
              className="size-4 accent-[#417D30]"
            />
            Solo con saldo disponible
          </label>
        </div>
      </Panel>

      {error && <ErrorNote message={error} />}
      {loading && !data && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatTile label="Afiliados" value={data.resumen.afiliados} />
            <StatTile label="Puntos entregados" value={data.resumen.puntosEntregados} />
            <StatTile label="Puntos redimidos" value={data.resumen.puntosRedimidos} tone="accent" />
            <StatTile label="Saldo disponible" value={data.resumen.saldoDisponible} />
          </div>

          <Panel
            title="Afiliados"
            description="Un registro por red de membresía (Padre + sus ciclos)"
          >
            <DataTable
              columns={columns}
              rows={data.rows}
              rowKey={(row) => row.rootId}
              sort={sort}
              direction={direction}
              onSort={handleSort}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- por vencer

function PorVencerTab({ refreshToken }: { refreshToken: number }) {
  const [dias, setDias] = useState("90");
  const [incluirVencidos, setIncluirVencidos] = useState(false);
  const [search, setSearch] = useState("");
  const [query_, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ dias });
    if (incluirVencidos) params.set("incluirVencidos", "1");
    if (query_) params.set("q", query_);
    return params.toString();
  }, [dias, incluirVencidos, query_]);

  const { data, loading, error } = useReport<ExpiringData>(
    `/api/admin/reports/expiring?${query}`,
    refreshToken
  );

  const columns: Column<ExpiringRow>[] = [
    {
      key: "nombre",
      header: "Afiliado",
      render: (row) => (
        <div className="max-w-64">
          <p className="truncate font-medium text-[#0b0b0b]">
            {row.nombre || "Sin nombre"}
          </p>
          <p className="truncate text-xs text-[#52514e]">{row.email || "Sin correo"}</p>
        </div>
      ),
    },
    {
      key: "membresia",
      header: "Membresía",
      render: (row) => (
        <span className="block max-w-72 truncate text-xs text-[#52514e]">
          {row.membershipName}
        </span>
      ),
    },
    {
      key: "saldoLote",
      header: "Puntos",
      numeric: true,
      render: (row) => (
        <span className="font-semibold">{formatNumber(row.saldoLote)}</span>
      ),
    },
    {
      key: "fechaEntrega",
      header: "Entregados",
      render: (row) => formatDate(row.fechaEntrega),
    },
    {
      key: "fechaVencimiento",
      header: "Vencen",
      render: (row) => formatDate(row.fechaVencimiento),
    },
    {
      key: "diasParaVencer",
      header: "Días",
      numeric: true,
      render: (row) =>
        row.diasParaVencer === null ? (
          "—"
        ) : row.diasParaVencer < 0 ? (
          <span className="font-semibold text-[#d03b3b]">
            Vencidos hace {Math.abs(row.diasParaVencer)}
          </span>
        ) : (
          formatNumber(row.diasParaVencer)
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Filtros"
        description="Este informe recorre el subformulario de puntos de cada membresía; la primera carga puede tardar."
        actions={<ExportButton href={`/api/admin/reports/expiring?${query}&format=csv`} />}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ventana">
            <select
              className={inputClass}
              value={dias}
              onChange={(event) => setDias(event.target.value)}
            >
              <option value="30">Próximos 30 días</option>
              <option value="60">Próximos 60 días</option>
              <option value="90">Próximos 90 días</option>
              <option value="180">Próximos 180 días</option>
              <option value="365">Próximo año</option>
              <option value="3650">Todos los lotes vigentes</option>
            </select>
          </Field>
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-[#52514e]">
            <input
              type="checkbox"
              checked={incluirVencidos}
              onChange={(event) => setIncluirVencidos(event.target.checked)}
              className="size-4 accent-[#417D30]"
            />
            Incluir lotes ya vencidos
          </label>
          <Field label="Buscar">
            <input
              type="search"
              placeholder="Afiliado o correo"
              className={`${inputClass} min-w-56`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
        </div>
      </Panel>

      {error && <ErrorNote message={error} />}
      {loading && !data && (
        <Spinner label="Consultando los lotes de puntos en Zoho… puede tardar hasta un minuto." />
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Puntos por vencer" value={data.resumen.puntos} tone="critical" />
            <StatTile label="Afiliados afectados" value={data.resumen.afiliados} />
            <StatTile label="Lotes de puntos" value={data.resumen.lotes} />
          </div>

          <Panel
            title="Distribución por ventana"
            description="Puntos con saldo vivo, agrupados por cercanía al vencimiento"
          >
            <OrdinalBarList
              valueLabel="puntos"
              bars={data.ventanas
                .filter((ventana) => ventana.lotes > 0)
                .map((ventana) => ({
                  label: ventana.etiqueta,
                  value: ventana.puntos,
                  critical: ventana.clave === "vencidos",
                  hint: `${formatNumber(ventana.lotes)} lotes · ${formatNumber(ventana.afiliados)} afiliados`,
                }))}
            />
          </Panel>

          <Panel
            title="Detalle por lote"
            description={`${formatNumber(data.rows.length)} lotes con saldo`}
          >
            <DataTable
              columns={columns}
              rows={data.rows}
              rowKey={(row) => `${row.membershipId}-${row.fechaVencimiento}-${row.fechaEntrega}`}
              emptyMessage="No hay puntos por vencer en esta ventana."
            />
          </Panel>
        </>
      )}
    </div>
  );
}
