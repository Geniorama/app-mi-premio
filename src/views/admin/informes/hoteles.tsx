"use client";

import { useState, useEffect, useMemo } from "react";
import {
  StatTile,
  Panel,
  DataTable,
  Field,
  FilterGrid,
  ActiveFilters,
  ExportButton,
  ReportSkeleton,
  BusyArea,
  ErrorNote,
  Pagination,
  formatNumber,
  formatCurrency,
  MoneyCell,
  formatDate,
  inputClass,
  type Column,
} from "@/components/admin/ui";
import { OrdinalBarList } from "@/components/admin/charts";
import { COP_PER_POINT } from "@/lib/points";
import {
  useRefreshToken,
  useReport,
  usePagination,
  useSyncedPage,
  withPagination,
  csvHref,
  type HotelsData,
  type HotelRow,
} from "./shared";

/**
 * Estadísticas por hotel.
 *
 * La unidad con hotel es el lote de puntos, no la redención: los puntos se
 * emiten contra la orden de compra de un hotel y es ahí donde aparece su
 * nombre. Por eso el informe habla de puntos entregados, no de canjes.
 */
const FILTROS_INICIALES = {
  orden: "puntosEntregados",
  sinHotel: "1",
  q: "",
};

export default function HotelesSection() {
  const refreshToken = useRefreshToken();

  const [filters, setFilters] = useState(FILTROS_INICIALES);
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

  const { data, loading, error } = useReport<HotelsData>(
    `/api/admin/reports/hotels?${withPagination(filterQuery, pagination.params)}`,
    refreshToken
  );

  useSyncedPage(pagination.sync, data?.pagination?.page);

  // Cualquier cambio de filtro vuelve a la primera página
  const applyFilters = (next: typeof filters) => {
    setFilters(next);
    reset();
  };

  // El orden no recorta resultados, así que no cuenta como filtro ni se limpia
  const activos = [filters.sinHotel !== FILTROS_INICIALES.sinHotel, filters.q].filter(Boolean).length;
  const limpiarFiltros = () => {
    setSearch("");
    applyFilters({ ...FILTROS_INICIALES, orden: filters.orden });
  };

  // La búsqueda se aplica con retardo para no consultar en cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.q === search ? current : { ...current, q: search }
      );
      reset();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, reset]);

  const columns: Column<HotelRow>[] = [
    {
      key: "hotel",
      header: "Hotel",
      render: (row) => (
        <div>
          <p className="font-medium text-[#0b0b0b]">{row.hotel}</p>
          <p className="text-xs text-[#52514e]">
            {formatNumber(row.lotes)} lotes · {formatNumber(row.afiliados)} afiliados
          </p>
        </div>
      ),
    },
    {
      key: "puntosEntregados",
      header: "Entregado",
      numeric: true,
      render: (row) => <MoneyCell points={row.puntosEntregados} />,
    },
    {
      key: "puntosRedimidos",
      header: "Redimido",
      numeric: true,
      render: (row) => <MoneyCell points={row.puntosRedimidos} />,
    },
    {
      key: "saldoVivo",
      header: "Saldo vivo",
      numeric: true,
      render: (row) => <MoneyCell points={row.saldoVivo} tone="accent" />,
    },
    {
      key: "puntosVencidos",
      header: "Vencido",
      numeric: true,
      render: (row) => <MoneyCell points={row.puntosVencidos} tone="critical" />,
    },
    {
      key: "participacion",
      header: "Participación",
      numeric: true,
      render: (row) => `${(row.participacion * 100).toFixed(1)} %`,
    },
    {
      key: "ultimaEntrega",
      header: "Última entrega",
      render: (row) => formatDate(row.ultimaEntrega),
    },
  ];

  // El ranking refleja la página visible con el orden aplicado arriba
  const barras = (data?.rows ?? []).slice(0, 10).map((row) => ({
    label: row.hotel,
    value: row.puntosEntregados,
    display: formatCurrency(row.valorEntregadoCOP),
    hint: `${formatNumber(row.puntosEntregados)} puntos · ${formatNumber(
      row.afiliados
    )} afiliados`,
  }));

  // Primera carga: esqueleto en lugar de filtros, para que nadie los use
  // antes de que lleguen los datos y sus opciones.
  if (loading && !data) return <ReportSkeleton filters={3} />;

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Filtros"
        actions={
          <>
            <ActiveFilters count={activos} onClear={limpiarFiltros} />
            <ExportButton href={csvHref("/api/admin/reports/hotels", filterQuery)} />
          </>
        }
      >
        <FilterGrid>
          <Field label="Ordenar por">
            <select
              disabled={loading}
              className={inputClass}
              value={filters.orden}
              onChange={(event) => applyFilters({ ...filters, orden: event.target.value })}
            >
              <option value="puntosEntregados">Puntos entregados</option>
              <option value="puntosRedimidos">Puntos redimidos</option>
              <option value="saldoVivo">Saldo vivo</option>
              <option value="afiliados">Afiliados</option>
              <option value="hotel">Nombre del hotel</option>
            </select>
          </Field>
          <Field label="Lotes sin hotel" active={filters.sinHotel !== FILTROS_INICIALES.sinHotel}>
            <select
              disabled={loading}
              className={inputClass}
              value={filters.sinHotel}
              onChange={(event) => applyFilters({ ...filters, sinHotel: event.target.value })}
            >
              <option value="1">Incluir</option>
              <option value="0">Ocultar</option>
            </select>
          </Field>
          <Field label="Buscar" wide active={Boolean(search)}>
            <input
              type="search"
              placeholder="Nombre del hotel"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Hoteles"
              value={data.resumen.hoteles}
              hint={`${formatNumber(data.resumen.lotes)} lotes de puntos`}
            />
            <StatTile
              label="Entregado"
              value={data.resumen.puntosEntregados}
              money
            />
            <StatTile
              label="Redimido"
              value={data.resumen.puntosRedimidos}
              money
              tone="accent"
            />
            <StatTile label="Saldo vivo" value={data.resumen.saldoVivo} money />
          </div>

          <Panel
            title="Valor entregado por hotel"
            description="Los diez primeros del listado, con el orden aplicado arriba."
          >
            <OrdinalBarList bars={barras} valueLabel="entregados" />
          </Panel>

          <Panel
            title="Detalle por hotel"
            description={`${formatNumber(data.pagination.total)} hoteles`}
          >
            <DataTable columns={columns} rows={data.rows} rowKey={(row) => row.hotel} />
            <Pagination
              meta={data.pagination}
              onPageChange={pagination.goTo}
              onPageSizeChange={pagination.changePageSize}
              itemLabel="hoteles"
            />
          </Panel>

          <p className="text-xs text-[#898781]">
            El hotel se toma de la orden de compra del lote de puntos
            (<code>Entrega_OC</code>);{" "}
            {formatNumber(data.resumen.sinHotel)} puntos vienen de lotes sin hotel
            identificable. Los puntos son fungibles y se consumen por antigüedad, así
            que <strong>Redimido</strong> es cuánto de lo que emitió el hotel ya se
            gastó, no con qué bono. Los valores en pesos usan la equivalencia del
            programa: 1 punto = {formatCurrency(COP_PER_POINT)}.
          </p>
        </BusyArea>
      )}
    </div>
  );
}
