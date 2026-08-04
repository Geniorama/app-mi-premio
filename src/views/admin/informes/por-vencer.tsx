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
  formatDate,
  inputClass,
  type Column,
} from "@/components/admin/ui";
import { OrdinalBarList } from "@/components/admin/charts";
import {
  useRefreshToken,
  useReport,
  usePagination,
  useSyncedPage,
  withPagination,
  csvHref,
  type ExpiringData,
  type ExpiringRow,
} from "./shared";

export default function PorVencerSection() {
  const refreshToken = useRefreshToken();

  const [dias, setDias] = useState("90");
  const [incluirVencidos, setIncluirVencidos] = useState(false);
  const [search, setSearch] = useState("");
  const [query_, setQuery] = useState("");
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
    const params = new URLSearchParams({ dias });
    if (incluirVencidos) params.set("incluirVencidos", "1");
    if (query_) params.set("q", query_);
    return params.toString();
  }, [dias, incluirVencidos, query_]);

  const { data, loading, error } = useReport<ExpiringData>(
    `/api/admin/reports/expiring?${withPagination(filterQuery, pagination.params)}`,
    refreshToken
  );

  useSyncedPage(pagination.sync, data?.pagination?.page);

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
        actions={<ExportButton href={csvHref("/api/admin/reports/expiring", filterQuery)} />}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ventana">
            <select
              className={inputClass}
              value={dias}
              onChange={(event) => {
                setDias(event.target.value);
                reset();
              }}
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
              onChange={(event) => {
                setIncluirVencidos(event.target.checked);
                reset();
              }}
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
            description={`${formatNumber(data.pagination.total)} lotes con saldo`}
          >
            <DataTable
              columns={columns}
              rows={data.rows}
              rowKey={(row) => `${row.membershipId}-${row.fechaVencimiento}-${row.fechaEntrega}`}
              emptyMessage="No hay puntos por vencer en esta ventana."
            />
            <Pagination
              meta={data.pagination}
              onPageChange={pagination.goTo}
              onPageSizeChange={pagination.changePageSize}
              itemLabel="lotes"
            />
          </Panel>
        </>
      )}
    </div>
  );
}
