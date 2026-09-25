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
  formatNights,
  formatCurrency,
  formatDate,
  MoneyCell,
  inputClass,
  type Column,
} from "@/components/admin/ui";
import { OrdinalBarList, ColumnChart } from "@/components/admin/charts";
import { COP_PER_POINT } from "@/lib/points";
import {
  useRefreshToken,
  useReport,
  usePagination,
  useSyncedPage,
  withPagination,
  csvHref,
  monthLabels,
  type NightsData,
  type NightsRow,
  type NightsVista,
} from "./shared";
import { PERIODOS, PERIODO_POR_DEFECTO } from "./periodos";

const VISTAS: Record<NightsVista, { label: string; item: string }> = {
  hotel: { label: "Hotel", item: "hoteles" },
  comercial: { label: "Comercial", item: "comerciales" },
  detalle: { label: "Hotel y comercial", item: "combinaciones" },
};

const FILTROS_INICIALES = {
  vista: "hotel" as NightsVista,
  orden: "noches",
  hotel: "",
  comercial: "",
  sinHotel: "1",
  q: "",
  desde: PERIODOS[PERIODO_POR_DEFECTO].desde,
  hasta: PERIODOS[PERIODO_POR_DEFECTO].hasta,
};

/** Lo que se lee de una noche en la gráfica y el ranking. */
const nochesTexto = (noches: number) =>
  `${formatNights(noches)} ${noches === 1 ? "noche" : "noches"}`;

/**
 * Noches vendidas por hotel y por comercial.
 *
 * Las noches no existen como dato en el CRM: se deducen de los puntos
 * entregados (1 noche = 400 puntos). El hotel sale de la orden de compra del
 * lote y el comercial del propietario del contacto del afiliado.
 */
export default function NochesSection() {
  const refreshToken = useRefreshToken();

  const [filters, setFilters] = useState(FILTROS_INICIALES);
  const [periodo, setPeriodo] = useState(PERIODO_POR_DEFECTO);
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

  const { data, loading, error } = useReport<NightsData>(
    `/api/admin/reports/nights?${withPagination(filterQuery, pagination.params)}`,
    refreshToken
  );

  useSyncedPage(pagination.sync, data?.pagination?.page);

  // Cualquier cambio de filtro vuelve a la primera página
  const applyFilters = (next: typeof filters) => {
    setFilters(next);
    reset();
  };

  // Ni la agrupación ni el orden recortan resultados: no cuentan como filtro
  const periodoActivo = periodo !== PERIODO_POR_DEFECTO;
  const sinHotelActivo = filters.sinHotel !== FILTROS_INICIALES.sinHotel;
  const activos = [
    periodoActivo,
    filters.hotel,
    filters.comercial,
    sinHotelActivo,
    filters.q,
  ].filter(Boolean).length;
  const limpiarFiltros = () => {
    setSearch("");
    setPeriodo(PERIODO_POR_DEFECTO);
    applyFilters({ ...FILTROS_INICIALES, vista: filters.vista, orden: filters.orden });
  };

  /** Un preset fija el rango; "personalizado" deja los campos al usuario. */
  const applyPeriodo = (clave: string) => {
    setPeriodo(clave);
    const preset = PERIODOS[clave];
    if (preset) {
      applyFilters({ ...filters, desde: preset.desde, hasta: preset.hasta });
    }
  };

  /** Tocar una fecha a mano rompe el preset: pasa a "personalizado". */
  const applyFecha = (campo: "desde" | "hasta", value: string) => {
    setPeriodo("personalizado");
    applyFilters({ ...filters, [campo]: value });
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

  const vista = data?.vista ?? filters.vista;

  const hotelColumn: Column<NightsRow> = {
    key: "hotel",
    header: "Hotel",
    render: (row) => (
      <div className="max-w-72">
        <p className="truncate font-medium text-[#0b0b0b]" title={row.hotel}>
          {row.hotel}
        </p>
        {vista === "hotel" && (
          <p className="text-xs text-[#52514e]">
            {formatNumber(row.comerciales)}{" "}
            {row.comerciales === 1 ? "comercial" : "comerciales"}
          </p>
        )}
      </div>
    ),
  };

  const comercialColumn: Column<NightsRow> = {
    key: "comercial",
    header: "Comercial",
    render: (row) => (
      <div className="max-w-64">
        <p className="truncate font-medium text-[#0b0b0b]">{row.comercial}</p>
        <p className="truncate text-xs text-[#52514e]">
          {vista === "comercial"
            ? `${formatNumber(row.hoteles)} ${row.hoteles === 1 ? "hotel" : "hoteles"}`
            : row.comercialEmail || "Sin correo en el CRM"}
        </p>
      </div>
    ),
  };

  const columns: Column<NightsRow>[] = [
    ...(vista !== "comercial" ? [hotelColumn] : []),
    ...(vista !== "hotel" ? [comercialColumn] : []),
    {
      key: "noches",
      header: "Noches",
      numeric: true,
      render: (row) => (
        <span className="font-semibold text-custom-green">{formatNights(row.noches)}</span>
      ),
    },
    {
      key: "puntosEntregados",
      header: "Puntos entregados",
      numeric: true,
      render: (row) => <MoneyCell points={row.puntosEntregados} />,
    },
    {
      key: "afiliados",
      header: "Afiliados",
      numeric: true,
      render: (row) => (
        <div>
          <p>{formatNumber(row.afiliados)}</p>
          <p className="text-xs font-normal text-[#52514e]">
            {formatNumber(row.lotes)} {row.lotes === 1 ? "lote" : "lotes"}
          </p>
        </div>
      ),
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
    label:
      vista === "hotel"
        ? row.hotel
        : vista === "comercial"
          ? row.comercial
          : `${row.hotel} · ${row.comercial}`,
    value: row.noches,
    display: nochesTexto(row.noches),
    hint: `${formatNumber(row.puntosEntregados)} puntos · ${formatNumber(
      row.afiliados
    )} afiliados`,
  }));

  // Primera carga: esqueleto en lugar de filtros, para que nadie elija sobre
  // desplegables todavía vacíos (hoteles y comerciales llegan con los datos).
  if (loading && !data) {
    return <ReportSkeleton filters={4} tiles={4} rows={8} />;
  }

  const etiquetaRango =
    data?.rango.desde || data?.rango.hasta
      ? `${data?.rango.desde || "inicio"} → ${data?.rango.hasta || "hoy"}`
      : "Todo el histórico";

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Filtros"
        actions={
          <>
            <ActiveFilters count={activos} onClear={limpiarFiltros} />
            <ExportButton href={csvHref("/api/admin/reports/nights", filterQuery)} />
          </>
        }
      >
        <FilterGrid>
          <Field label="Agrupar por">
            <select
              disabled={loading}
              className={inputClass}
              value={filters.vista}
              onChange={(event) =>
                applyFilters({ ...filters, vista: event.target.value as NightsVista })
              }
            >
              {Object.entries(VISTAS).map(([clave, { label }]) => (
                <option key={clave} value={clave}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ordenar por">
            <select
              disabled={loading}
              className={inputClass}
              value={filters.orden}
              onChange={(event) => applyFilters({ ...filters, orden: event.target.value })}
            >
              <option value="noches">Noches vendidas</option>
              <option value="afiliados">Afiliados</option>
              <option value="ultimaEntrega">Última entrega</option>
              <option value="nombre">Nombre</option>
            </select>
          </Field>
          <Field label="Hotel" wide active={Boolean(filters.hotel)}>
            <select
              disabled={loading}
              className={inputClass}
              value={filters.hotel}
              onChange={(event) => applyFilters({ ...filters, hotel: event.target.value })}
            >
              <option value="">Todos los hoteles</option>
              {(data?.hotelesDisponibles ?? []).map((hotel) => (
                <option key={hotel} value={hotel}>
                  {hotel}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Comercial" wide active={Boolean(filters.comercial)}>
            <select
              disabled={loading}
              className={inputClass}
              value={filters.comercial}
              onChange={(event) => applyFilters({ ...filters, comercial: event.target.value })}
            >
              <option value="">Todos los comerciales</option>
              {(data?.comercialesDisponibles ?? []).map((comercial) => (
                <option key={comercial.id} value={comercial.id}>
                  {comercial.nombre}
                </option>
              ))}
              <option value="sin">Sin comercial asignado</option>
            </select>
          </Field>
          <Field label="Lotes sin hotel" active={sinHotelActivo}>
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
              placeholder="Hotel, comercial o correo"
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
        </FilterGrid>

        <div className="mt-4 border-t border-black/10 pt-4">
          <FilterGrid>
            <Field label="Periodo" active={periodoActivo}>
              <select
                disabled={loading}
                className={inputClass}
                value={periodo}
                onChange={(event) => applyPeriodo(event.target.value)}
              >
                {Object.entries(PERIODOS).map(([clave, preset]) => (
                  <option key={clave} value={clave}>
                    {preset.label}
                  </option>
                ))}
                <option value="personalizado">Rango personalizado</option>
              </select>
            </Field>
            <Field label="Desde" active={periodo === "personalizado"}>
              <input
                type="date"
                disabled={loading}
                className={inputClass}
                value={filters.desde}
                onChange={(event) => applyFecha("desde", event.target.value)}
              />
            </Field>
            <Field label="Hasta" active={periodo === "personalizado"}>
              <input
                type="date"
                disabled={loading}
                className={inputClass}
                value={filters.hasta}
                onChange={(event) => applyFecha("hasta", event.target.value)}
              />
            </Field>
          </FilterGrid>
          <p className="mt-2 text-xs text-[#52514e]">
            Una noche se cuenta en la fecha en que se entregaron sus puntos.
          </p>
        </div>
      </Panel>

      {error && <ErrorNote message={error} />}

      {data && (
        <BusyArea busy={loading}>
          <ActiveFilters count={activos} onClear={limpiarFiltros} variant="banner" />
          {!data.padron.disponible && (
            <ErrorNote message="No se pudo leer el módulo Contacts de Zoho: sin él no hay comerciales que asignar y todas las noches caen en «sin comercial asignado». Vuelve a intentarlo en unos minutos." />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Noches vendidas"
              value={formatNights(data.resumen.noches)}
              tone="accent"
              hint={etiquetaRango}
            />
            <StatTile label="Puntos entregados" value={data.resumen.puntosEntregados} money />
            <StatTile
              label="Hoteles"
              value={data.resumen.hoteles}
              hint={`${formatNumber(data.resumen.lotes)} lotes de puntos`}
            />
            <StatTile
              label="Comerciales"
              value={data.resumen.comerciales}
              hint={`${formatNumber(data.resumen.afiliados)} afiliados`}
            />
          </div>

          <Panel
            title="Noches mes a mes"
            description="Últimos 12 meses, con el hotel y el comercial filtrados arriba (el periodo no recorta la gráfica)."
          >
            <ColumnChart
              points={data.serieMensual.map((punto) => {
                const etiquetas = monthLabels(punto.mes);
                return {
                  label: etiquetas.short,
                  fullLabel: etiquetas.full,
                  value: punto.noches,
                  display: formatNights(punto.noches),
                  valueHint: `${formatNumber(punto.noches * data.puntosPorNoche)} puntos`,
                };
              })}
              valueLabel="noches"
              emptyMessage="No se entregaron puntos en los últimos 12 meses."
            />
          </Panel>

          <Panel
            title={`Noches por ${VISTAS[vista].label.toLowerCase()}`}
            description="Los diez primeros del listado, con el orden aplicado arriba."
          >
            <OrdinalBarList bars={barras} valueLabel="noches" />
          </Panel>

          <Panel
            title={`Detalle por ${VISTAS[vista].label.toLowerCase()}`}
            description={`${formatNumber(data.pagination.total)} ${VISTAS[vista].item}`}
          >
            <DataTable columns={columns} rows={data.rows} rowKey={(row) => row.clave} />
            <Pagination
              meta={data.pagination}
              onPageChange={pagination.goTo}
              onPageSizeChange={pagination.changePageSize}
              itemLabel={VISTAS[vista].item}
            />
          </Panel>

          <p className="text-xs text-[#898781]">
            Las noches se deducen de los puntos entregados:{" "}
            <strong>1 noche = {formatNumber(data.puntosPorNoche)} puntos</strong>. El
            hotel se toma de la orden de compra del lote (<code>Entrega_OC</code>) y el
            comercial es el propietario del contacto del afiliado en Zoho.{" "}
            {data.resumen.nochesSinHotel > 0 && (
              <>
                {formatNights(data.resumen.nochesSinHotel)} noches vienen de lotes sin
                hotel identificable.{" "}
              </>
            )}
            {data.resumen.nochesSinComercial > 0 && (
              <>
                {formatNights(data.resumen.nochesSinComercial)} noches son de afiliados
                sin propietario en el CRM.{" "}
              </>
            )}
            {data.resumen.lotesFraccionados > 0 && (
              <>
                {formatNumber(data.resumen.lotesFraccionados)} lotes no son múltiplo
                exacto de {formatNumber(data.puntosPorNoche)} puntos (ajustes o cargas
                parciales) y aportan fracciones de noche.{" "}
              </>
            )}
            Los valores en pesos usan la equivalencia del programa: 1 punto ={" "}
            {formatCurrency(COP_PER_POINT)}.
          </p>
        </BusyArea>
      )}
    </div>
  );
}
