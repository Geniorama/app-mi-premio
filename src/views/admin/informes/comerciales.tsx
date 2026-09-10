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
  formatCurrency,
  formatDate,
  MoneyCell,
  inputClass,
  type Column,
} from "@/components/admin/ui";
import { OrdinalBarList, ColumnChart, Sparkline } from "@/components/admin/charts";
import { COP_PER_POINT } from "@/lib/points";
import {
  useRefreshToken,
  useReport,
  usePagination,
  useSyncedPage,
  withPagination,
  csvHref,
  monthLabels,
  type OwnersData,
  type OwnerRow,
} from "./shared";

/**
 * Presets del periodo de altas.
 *
 * Se resuelven en el navegador a fechas `AAAA-MM-DD` concretas y viajan como
 * `desde`/`hasta`, de modo que el servidor no tiene que interpretar ninguna
 * etiqueta: recibe siempre un rango explícito y devuelve el que aplicó.
 */
const hoy = () => new Date();

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

/** Primer día del mes `offset` meses atrás (0 = mes en curso). */
const inicioDeMes = (offset: number) => {
  const date = hoy();
  date.setDate(1);
  date.setMonth(date.getMonth() - offset);
  return date;
};

/** Último día del mes `offset` meses atrás. */
const finDeMes = (offset: number) => {
  const date = inicioDeMes(offset);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return date;
};

const PERIODOS: Record<string, { label: string; desde: string; hasta: string }> = {
  mesActual: {
    label: "Mes en curso",
    desde: iso(inicioDeMes(0)),
    hasta: iso(hoy()),
  },
  mesAnterior: {
    label: "Último mes cerrado",
    desde: iso(inicioDeMes(1)),
    hasta: iso(finDeMes(1)),
  },
  tresMeses: {
    label: "Últimos 3 meses",
    desde: iso(inicioDeMes(2)),
    hasta: iso(hoy()),
  },
  doceMeses: {
    label: "Últimos 12 meses",
    desde: iso(inicioDeMes(11)),
    hasta: iso(hoy()),
  },
  historico: { label: "Todo el histórico", desde: "", hasta: "" },
};

/**
 * Gestión por comercial.
 *
 * El comercial de un afiliado es el propietario de su contacto en Zoho: la
 * misma asignación que ve el equipo en el CRM. El informe la agrega, no la
 * reinterpreta — si una fila no cuadra, se corrige cambiando el propietario
 * del contacto en Zoho.
 */
export default function ComercialesSection() {
  const refreshToken = useRefreshToken();

  const [filters, setFilters] = useState({
    orden: "puntosEntregados",
    sinComercial: "1",
    q: "",
    desde: PERIODOS.doceMeses.desde,
    hasta: PERIODOS.doceMeses.hasta,
  });
  const [periodo, setPeriodo] = useState("doceMeses");
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

  const { data, loading, error } = useReport<OwnersData>(
    `/api/admin/reports/owners?${withPagination(filterQuery, pagination.params)}`,
    refreshToken
  );

  useSyncedPage(pagination.sync, data?.pagination?.page);

  // Cualquier cambio de filtro vuelve a la primera página
  const applyFilters = (next: typeof filters) => {
    setFilters(next);
    reset();
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

  const columns: Column<OwnerRow>[] = [
    {
      key: "comercial",
      header: "Comercial",
      render: (row) => (
        <div className="max-w-64">
          <p className="truncate font-medium text-[#0b0b0b]">{row.comercial}</p>
          <p className="truncate text-xs text-[#52514e]">
            {row.email || "Sin correo en el CRM"}
          </p>
        </div>
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
            {formatNumber(row.conMembresia)} con membresía
            {row.sinMembresia > 0 && ` · ${formatNumber(row.sinMembresia)} sin`}
          </p>
        </div>
      ),
    },
    {
      key: "altas",
      header: "Altas",
      numeric: true,
      render: (row) => (
        <div className="flex flex-col items-end gap-1">
          <span className="font-semibold text-[#0b0b0b]">
            {formatNumber(row.altas)}
          </span>
          <Sparkline
            values={row.serie}
            title={`Altas mes a mes, ${
              data?.meses?.length ? monthLabels(data.meses[0]).full : ""
            } – ${
              data?.meses?.length
                ? monthLabels(data.meses[data.meses.length - 1]).full
                : ""
            }`}
          />
        </div>
      ),
    },
    {
      key: "ultimaAlta",
      header: "Última alta",
      render: (row) => formatDate(row.ultimaAlta),
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
      render: (row) => <MoneyCell points={row.puntosRedimidos} tone="accent" />,
    },
    {
      key: "tasaRedencion",
      header: "Tasa de redención",
      numeric: true,
      render: (row) => (
        <div>
          <p>{(row.tasaRedencion * 100).toFixed(1)} %</p>
          <p className="text-xs font-normal text-[#52514e]">
            {formatNumber(row.redenciones)}{" "}
            {row.redenciones === 1 ? "canje" : "canjes"}
          </p>
        </div>
      ),
    },
    {
      key: "tasaActivacion",
      header: "Activados",
      numeric: true,
      render: (row) => (
        <div>
          <p>{(row.tasaActivacion * 100).toFixed(1)} %</p>
          <p className="text-xs font-normal text-[#52514e]">
            {formatNumber(row.conRedenciones)} de {formatNumber(row.afiliados)}
          </p>
        </div>
      ),
    },
    {
      key: "saldoDisponible",
      header: "Saldo",
      numeric: true,
      render: (row) => (
        <span className="font-semibold text-custom-green">
          {formatNumber(row.saldoDisponible)}
        </span>
      ),
    },
    {
      key: "puntosPorVencer",
      header: "Por vencer",
      numeric: true,
      render: (row) => formatNumber(row.puntosPorVencer),
    },
    {
      key: "ultimaRedencion",
      header: "Última redención",
      render: (row) => formatDate(row.ultimaRedencion),
    },
  ];

  // El ranking refleja la página visible con el orden aplicado arriba
  const barras = (data?.rows ?? []).slice(0, 10).map((row) => ({
    label: row.comercial,
    value: row.puntosEntregados,
    display: formatCurrency(row.valorEntregadoCOP),
    hint: `${formatNumber(row.afiliados)} afiliados · ${(
      row.tasaRedencion * 100
    ).toFixed(1)} % redimido`,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Filtros"
        actions={<ExportButton href={csvHref("/api/admin/reports/owners", filterQuery)} />}
      >
        <div className="flex flex-wrap gap-3">
          <Field label="Ordenar por">
            <select
              className={inputClass}
              value={filters.orden}
              onChange={(event) => applyFilters({ ...filters, orden: event.target.value })}
            >
              <option value="puntosEntregados">Puntos entregados</option>
              <option value="puntosRedimidos">Puntos redimidos</option>
              <option value="saldoDisponible">Saldo disponible</option>
              <option value="afiliados">Afiliados a cargo</option>
              <option value="altas">Altas en el periodo</option>
              <option value="tasaRedencion">Tasa de redención</option>
              <option value="tasaActivacion">Afiliados activados</option>
              <option value="comercial">Nombre del comercial</option>
            </select>
          </Field>
          <Field label="Sin comercial asignado">
            <select
              className={inputClass}
              value={filters.sinComercial}
              onChange={(event) =>
                applyFilters({ ...filters, sinComercial: event.target.value })
              }
            >
              <option value="1">Incluir</option>
              <option value="0">Ocultar</option>
            </select>
          </Field>
          <Field label="Buscar">
            <input
              type="search"
              placeholder="Nombre o correo del comercial"
              className={`${inputClass} min-w-56`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-black/10 pt-4">
          <Field label="Periodo de altas">
            <select
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
          <Field label="Desde">
            <input
              type="date"
              className={inputClass}
              value={filters.desde}
              onChange={(event) => applyFecha("desde", event.target.value)}
            />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              className={inputClass}
              value={filters.hasta}
              onChange={(event) => applyFecha("hasta", event.target.value)}
            />
          </Field>
          <p className="h-9 max-w-80 self-end text-xs leading-tight text-[#52514e]">
            Un afiliado cuenta como alta el mes en que recibió sus primeros
            puntos. El periodo solo afecta a la columna <strong>Altas</strong>;
            el resto de cifras son del histórico.
          </p>
        </div>
      </Panel>

      {error && <ErrorNote message={error} />}
      {loading && !data && <Spinner />}

      {data && (
        <>
          {!data.padron.disponible && (
            <ErrorNote message="No se pudo leer el módulo Contacts de Zoho: sin él no hay propietarios que agrupar y todo cae en «sin comercial asignado». Vuelve a intentarlo en unos minutos." />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Comerciales"
              value={data.resumen.comerciales}
              hint={`${formatNumber(data.resumen.afiliados)} afiliados a cargo`}
            />
            <StatTile
              label="Altas en el periodo"
              value={data.resumen.altas}
              tone="accent"
              hint={
                data.rango.desde || data.rango.hasta
                  ? `${data.rango.desde || "inicio"} → ${data.rango.hasta || "hoy"}`
                  : "Todo el histórico"
              }
            />
            <StatTile label="Entregado" value={data.resumen.puntosEntregados} money />
            <StatTile
              label="Redimido"
              value={data.resumen.puntosRedimidos}
              money
              hint={`${(data.resumen.tasaRedencion * 100).toFixed(
                1
              )} % de lo entregado`}
            />
          </div>

          <Panel
            title="Altas mes a mes"
            description="Afiliados que recibieron sus primeros puntos, en los últimos 12 meses. Refleja los comerciales que deje visibles el filtro."
          >
            <ColumnChart
              points={data.serieAltas.map((punto) => {
                const etiquetas = monthLabels(punto.mes);
                return {
                  label: etiquetas.short,
                  fullLabel: etiquetas.full,
                  value: punto.altas,
                  valueHint:
                    punto.altas === 1 ? "1 afiliado" : `${punto.altas} afiliados`,
                };
              })}
              valueLabel="altas"
              emptyMessage="Ningún afiliado estrenó puntos en los últimos 12 meses."
            />
          </Panel>

          <Panel
            title="Valor entregado por comercial"
            description="Los diez primeros del listado, con el orden aplicado arriba."
          >
            <OrdinalBarList bars={barras} valueLabel="entregados" />
          </Panel>

          <Panel
            title="Detalle por comercial"
            description={`${formatNumber(data.pagination.total)} comerciales`}
          >
            <DataTable
              columns={columns}
              rows={data.rows}
              // El grupo sin comercial no tiene id: su clave es la cadena vacía
              rowKey={(row) => row.comercialId || "sin-comercial"}
            />
            <Pagination
              meta={data.pagination}
              onPageChange={pagination.goTo}
              onPageSizeChange={pagination.changePageSize}
              itemLabel="comerciales"
            />
          </Panel>

          <p className="text-xs text-[#898781]">
            El comercial sale del <strong>propietario del contacto</strong> en Zoho
            (<code>Owner</code>): para reasignar un afiliado se cambia allí y el
            informe lo recoge en la siguiente lectura.{" "}
            {data.resumen.sinComercial > 0 && (
              <>
                {formatNumber(data.resumen.sinComercial)} afiliados no tienen
                propietario identificable —normalmente redes cuyo contacto salió del
                padrón activo—.{" "}
              </>
            )}
            <strong>Afiliados</strong> cuenta redes de membresía, así que un contacto
            con dos redes suma dos. <strong>Activados</strong> es cuántos de ellos han
            redimido al menos una vez. Los valores en pesos usan la equivalencia del
            programa: 1 punto = {formatCurrency(COP_PER_POINT)}.
          </p>

          <p className="text-xs text-[#898781]">
            <strong>Sobre las altas.</strong> Zoho no guarda una fecha de inscripción
            al programa, así que un afiliado cuenta como alta el mes en que recibió{" "}
            <strong>sus primeros puntos</strong>: es el primer hecho con fecha que hay
            en el CRM.{" "}
            {data.resumen.sinAlta > 0 && (
              <>
                {formatNumber(data.resumen.sinAlta)} afiliados no aparecen en ninguna
                alta porque todavía no han recibido puntos —están registrados, pero no
                han empezado—.{" "}
              </>
            )}
            El minigráfico de cada fila usa su propia escala: sirve para ver la forma de
            un comercial en el tiempo, no para compararlo en altura con otro.
          </p>
        </>
      )}
    </div>
  );
}
