"use client";

import { useState, useEffect, useMemo } from "react";
import {
  StatTile,
  Panel,
  DataTable,
  Field,
  FilterGrid,
  CheckField,
  ActiveFilters,
  ExportButton,
  ReportSkeleton,
  BusyArea,
  ErrorNote,
  Pagination,
  formatNumber,
  formatPointsAsCop,
  MoneyCell,
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

const DIAS_POR_DEFECTO = "90";

export default function PorVencerSection() {
  const refreshToken = useRefreshToken();

  const [dias, setDias] = useState(DIAS_POR_DEFECTO);
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
      header: "Valor",
      numeric: true,
      render: (row) => (
        <MoneyCell points={row.saldoLote} tone="critical" />
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

  const activos = [dias !== DIAS_POR_DEFECTO, incluirVencidos, query_].filter(Boolean).length;
  const limpiarFiltros = () => {
    setDias(DIAS_POR_DEFECTO);
    setIncluirVencidos(false);
    setSearch("");
    setQuery("");
    reset();
  };

  // Primera carga: esqueleto en lugar de filtros, para que nadie los use
  // antes de que lleguen los datos y sus opciones.
  if (loading && !data) {
    return (
      <ReportSkeleton
        filters={2}
        label="Consultando los lotes de puntos en Zoho… puede tardar hasta un minuto."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Filtros"
        description="Este informe recorre el subformulario de puntos de cada membresía; la primera carga puede tardar."
        actions={
          <>
            <ActiveFilters count={activos} onClear={limpiarFiltros} />
            <ExportButton href={csvHref("/api/admin/reports/expiring", filterQuery)} />
          </>
        }
      >
        <FilterGrid>
          <Field label="Ventana" active={dias !== DIAS_POR_DEFECTO}>
            <select
              disabled={loading}
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
          <CheckField
            label="Incluir lotes ya vencidos"
            disabled={loading}
            checked={incluirVencidos}
            onChange={(checked) => {
              setIncluirVencidos(checked);
              reset();
            }}
          />
          <Field label="Buscar" wide active={Boolean(search)}>
            <input
              type="search"
              placeholder="Afiliado o correo"
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
        </FilterGrid>
      </Panel>

      {error && <ErrorNote message={error} />}

      {data && (
        <BusyArea busy={loading}>
          <ActiveFilters count={activos} onClear={limpiarFiltros} variant="banner" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Por vencer"
              value={data.resumen.puntos}
              money
              tone="critical"
            />
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
                  display: formatPointsAsCop(ventana.puntos),
                  critical: ventana.clave === "vencidos",
                  hint: `${formatNumber(ventana.puntos)} puntos · ${formatNumber(ventana.lotes)} lotes · ${formatNumber(ventana.afiliados)} afiliados`,
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
              rowKey={(row) => row.loteId}
              emptyMessage="No hay puntos por vencer en esta ventana."
            />
            <Pagination
              meta={data.pagination}
              onPageChange={pagination.goTo}
              onPageSizeChange={pagination.changePageSize}
              itemLabel="lotes"
            />
          </Panel>
        </BusyArea>
      )}
    </div>
  );
}
