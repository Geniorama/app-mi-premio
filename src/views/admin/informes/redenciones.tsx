"use client";

import { useState, useEffect, useMemo } from "react";
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
  type RedemptionsData,
  type RedemptionRow,
} from "./shared";

export default function RedencionesSection() {
  const refreshToken = useRefreshToken();

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    estado: "",
    origen: "",
    q: "",
  });
  const [search, setSearch] = useState("");
  const pagination = usePagination();
  const { reset } = pagination;

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [filters]);

  const { data, loading, error } = useReport<RedemptionsData>(
    `/api/admin/reports/redemptions?${withPagination(filterQuery, pagination.params)}`,
    refreshToken
  );

  useSyncedPage(pagination.sync, data?.pagination?.page);

  // Cualquier cambio de filtro vuelve a la primera página
  const applyFilters = (next: typeof filters) => {
    setFilters(next);
    reset();
  };

  // La búsqueda se aplica con retardo para no consultar en cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.q === search ? current : {...current, q: search}));
      reset();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, reset]);

  const columns: Column<RedemptionRow>[] = [
    {
      key: "nombre",
      header: "Redención",
      render: (row) => (
        <div>
          <p className="font-medium text-[#0b0b0b]">{row.nombre}</p>
          <p className="text-xs text-[#52514e]">
            {row.origenWeb ? "Web" : "CRM"}
            {row.tramos > 1 && (
              // Un bono puede consumir varias membresías de la red (FIFO):
              // la fila los une, pero conviene ver que en Zoho son N registros.
              <span title={row.membresias.join(", ")}>
                {" · "}
                {row.tramos} registros en Zoho
              </span>
            )}
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
      header: "Valor",
      numeric: true,
      render: (row) => <MoneyCell points={row.puntos} />,
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill status={row.estado} />
          {row.estadoMixto && (
            <span className="text-xs text-[#898781]">
              Estados distintos entre registros
            </span>
          )}
        </div>
      ),
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
          <ExportButton href={csvHref("/api/admin/reports/redemptions", filterQuery)} />
        }
      >
        <div className="flex flex-wrap gap-3">
          <Field label="Desde">
            <input
              type="date"
              className={inputClass}
              value={filters.from}
              onChange={(event) => applyFilters({ ...filters, from: event.target.value })}
            />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              className={inputClass}
              value={filters.to}
              onChange={(event) => applyFilters({ ...filters, to: event.target.value })}
            />
          </Field>
          <Field label="Estado">
            <select
              className={inputClass}
              value={filters.estado}
              onChange={(event) => applyFilters({ ...filters, estado: event.target.value })}
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
              onChange={(event) => applyFilters({ ...filters, origen: event.target.value })}
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
            <StatTile
              label="Redenciones"
              value={data.resumen.redenciones}
              hint={
                data.resumen.registrosZoho > data.resumen.redenciones
                  ? `${formatNumber(data.resumen.registrosZoho)} registros en Zoho`
                  : undefined
              }
            />
            <StatTile
              label="Redimido"
              value={data.resumen.puntos}
              money
              hint="1 punto = $ 10"
              tone="accent"
            />
            <StatTile
              label="Originadas en la web"
              value={data.resumen.desdeWeb}
              hint="El resto se creó en el CRM"
            />
          </div>

          <Panel
            title="Detalle de redenciones"
            description={`${formatNumber(data.pagination.total)} registros`}
          >
            <DataTable
              columns={columns}
              rows={data.rows}
              rowKey={(row) => row.id}
            />
            <Pagination
              meta={data.pagination}
              onPageChange={pagination.goTo}
              onPageSizeChange={pagination.changePageSize}
              itemLabel="redenciones"
            />
          </Panel>
        </>
      )}
    </div>
  );
}
