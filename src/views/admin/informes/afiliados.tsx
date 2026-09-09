"use client";

import { useState, useEffect, useMemo } from "react";
import {
  StatTile,
  Panel,
  DataTable,
  Field,
  ExportButton,
  Spinner,
  ErrorNote,
  Pagination,
  formatNumber,
  MoneyCell,
  formatDate,
  inputClass,
  type Column,
} from "@/components/admin/ui";
import {
  useRefreshToken,
  useReport,
  usePagination,
  useSyncedPage,
  withPagination,
  csvHref,
  type AffiliatesData,
  type AffiliateRow,
} from "./shared";

export default function AfiliadosSection() {
  const refreshToken = useRefreshToken();

  const [search, setSearch] = useState("");
  const [query_, setQuery] = useState("");
  const [tipo, setTipo] = useState("");
  const [membresia, setMembresia] = useState("");
  const [conSaldo, setConSaldo] = useState(false);
  const [sort, setSort] = useState("puntosEntregados");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const pagination = usePagination();
  const { reset } = pagination;

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      reset();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, reset]);

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (query_) params.set("q", query_);
    if (tipo) params.set("tipo", tipo);
    if (membresia) params.set("membresia", membresia);
    if (conSaldo) params.set("conSaldo", "1");
    params.set("sort", sort);
    params.set("dir", direction);
    return params.toString();
  }, [query_, tipo, membresia, conSaldo, sort, direction]);

  const { data, loading, error } = useReport<AffiliatesData>(
    `/api/admin/reports/affiliates?${withPagination(filterQuery, pagination.params)}`,
    refreshToken
  );

  useSyncedPage(pagination.sync, data?.pagination?.page);

  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  /** Abre el área de afiliados vista como esa persona, en solo lectura. */
  const startPreview = async (email: string) => {
    setPreviewing(email);
    setPreviewError(null);
    try {
      const response = await fetch("/api/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();

      if (!response.ok) {
        setPreviewError(result?.error ?? "No se pudo abrir la previsualización");
        return;
      }
      window.location.href = result.redirect ?? "/perfil";
    } catch {
      setPreviewError("Error de conexión. Intenta de nuevo.");
    } finally {
      setPreviewing(null);
    }
  };

  // Reordenar cambia qué filas caen en cada página, así que vuelve al inicio
  const handleSort = (key: string) => {
    reset();
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
    {
      key: "membresiaNo",
      header: "Membresía",
      render: (row) =>
        row.conMembresia ? (
          <div>
            <p className="text-[#0b0b0b]">{row.membresiaNo || "—"}</p>
            <p className="text-xs text-[#52514e]">
              {formatNumber(row.ciclos)} {row.ciclos === 1 ? "ciclo" : "ciclos"}
            </p>
          </div>
        ) : (
          <span className="inline-block rounded bg-black/[0.06] px-1.5 py-0.5 text-xs font-medium text-[#52514e]">
            Sin membresía
          </span>
        ),
    },
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
      header: "Redimido",
      numeric: true,
      sortKey: "puntosRedimidos",
      // Solo esta columna va en pesos: es lo que el afiliado ya consumió del
      // programa. Las demás son saldos de puntos todavía sin gastar.
      render: (row) => <MoneyCell points={row.puntosRedimidos} />,
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
    {
      key: "preview",
      header: "",
      // Sin membresía no hay perfil que mirar: el área de afiliados se
      // alimenta de la membresía en Zoho y saldría vacía.
      render: (row) => {
        if (!row.conMembresia) {
          return <span className="text-xs text-[#898781]">Sin membresía</span>;
        }
        if (!row.email) {
          return <span className="text-xs text-[#898781]">Sin correo</span>;
        }

        return (
          <button
            type="button"
            disabled={previewing === row.email}
            onClick={() => startPreview(row.email)}
            title={`Ver el sitio como ${row.nombre || row.email} (solo lectura)`}
            className="cursor-pointer whitespace-nowrap rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium transition-colors hover:border-custom-green hover:text-custom-green disabled:opacity-50"
          >
            {previewing === row.email ? "Abriendo…" : "Ver como"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Filtros"
        actions={<ExportButton href={csvHref("/api/admin/reports/affiliates", filterQuery)} />}
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
              onChange={(event) => {
                setTipo(event.target.value);
                reset();
              }}
            >
              <option value="">Todos</option>
              {(data?.tipos ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Membresía">
            <select
              className={inputClass}
              value={membresia}
              onChange={(event) => {
                setMembresia(event.target.value);
                reset();
              }}
            >
              <option value="">Todos los del CRM</option>
              <option value="con">Solo con membresía</option>
              <option value="sin">Solo sin membresía</option>
            </select>
          </Field>
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-[#52514e]">
            <input
              type="checkbox"
              checked={conSaldo}
              onChange={(event) => {
                setConSaldo(event.target.checked);
                reset();
              }}
              className="size-4 accent-[#417D30]"
            />
            Solo con saldo disponible
          </label>
        </div>
      </Panel>

      {error && <ErrorNote message={error} />}
      {previewError && <ErrorNote message={previewError} />}
      {loading && !data && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatTile
              label="Afiliados"
              value={data.resumen.afiliados}
              hint={
                data.resumen.afiliados === data.resumen.afiliadosCRM
                  ? `${formatNumber(data.resumen.conMembresia)} con membresía · ${formatNumber(
                      data.resumen.sinMembresia
                    )} sin`
                  : `de ${formatNumber(data.resumen.afiliadosCRM)} en total`
              }
            />
            <StatTile label="Puntos entregados" value={data.resumen.puntosEntregados} />
            <StatTile
              label="Redimido"
              value={data.resumen.puntosRedimidos}
              money
              tone="accent"
            />
            <StatTile label="Saldo disponible" value={data.resumen.saldoDisponible} />
          </div>

          {!data.padron.disponible ? (
            <ErrorNote message="No se pudo leer el módulo Contacts de Zoho, así que el comparativo solo incluye a quienes tienen membresía. Vuelve a intentarlo en unos minutos." />
          ) : (
            <Panel
              title="Con membresía frente a sin membresía"
              description={`${formatNumber(
                data.padron.contactos
              )} afiliados activos en el CRM. Sin membresía = afiliado registrado que todavía no ha recibido puntos.`}
            >
              <DataTable
                rows={data.comparativo}
                rowKey={(row) => row.grupo}
                columns={[
                  {
                    key: "etiqueta",
                    header: "Grupo",
                    render: (row) => (
                      <span className="font-medium text-[#0b0b0b]">{row.etiqueta}</span>
                    ),
                  },
                  {
                    key: "afiliados",
                    header: "Afiliados",
                    numeric: true,
                    render: (row) => (
                      <div>
                        <p className="font-semibold">{formatNumber(row.afiliados)}</p>
                        <p className="text-xs font-normal text-[#52514e]">
                          {(row.participacion * 100).toFixed(1)} % del padrón
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "empresas",
                    header: "Empresas",
                    numeric: true,
                    render: (row) => formatNumber(row.empresas),
                  },
                  {
                    key: "conSaldo",
                    header: "Con saldo",
                    numeric: true,
                    render: (row) => formatNumber(row.conSaldo),
                  },
                  {
                    key: "conRedenciones",
                    header: "Han redimido",
                    numeric: true,
                    render: (row) => formatNumber(row.conRedenciones),
                  },
                  {
                    key: "puntosEntregados",
                    header: "Entregado",
                    numeric: true,
                    render: (row) => <MoneyCell points={row.puntosEntregados} />,
                  },
                  {
                    key: "saldoDisponible",
                    header: "Saldo",
                    numeric: true,
                    render: (row) => (
                      <MoneyCell points={row.saldoDisponible} tone="accent" />
                    ),
                  },
                ]}
              />
              {data.padron.truncado && (
                <p className="mt-4 text-xs font-medium text-[#d03b3b]">
                  Se alcanzó el tope de lectura del módulo Contacts: faltan afiliados
                  por contar en el grupo &ldquo;sin membresía&rdquo;.
                </p>
              )}
              {data.padron.conMembresiaFueraDelPadron > 0 && (
                <p className="mt-4 text-xs text-[#52514e]">
                  {formatNumber(data.padron.conMembresiaFueraDelPadron)} membresías
                  pertenecen a contactos que no están en el padrón activo (dados de
                  baja en fidelización). Siguen listadas porque tienen puntos, así que
                  el total con membresía puede superar al padrón.
                </p>
              )}
            </Panel>
          )}

          <Panel
            title="Afiliados"
            description="Un registro por red de membresía; los contactos sin membresía van con las cifras en cero."
          >
            <DataTable
              columns={columns}
              rows={data.rows}
              // Una fila = una red de membresía, y un mismo contacto puede tener
              // varias redes: el contacto solo identifica a los que no tienen
              // ninguna (rootId vacío).
              rowKey={(row) => row.rootId || row.contactId}
              sort={sort}
              direction={direction}
              onSort={handleSort}
            />
            <Pagination
              meta={data.pagination}
              onPageChange={pagination.goTo}
              onPageSizeChange={pagination.changePageSize}
              itemLabel="afiliados"
            />
          </Panel>
        </>
      )}
    </div>
  );
}
