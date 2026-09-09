"use client";

import { useState, useMemo } from "react";
import {
  StatTile,
  Panel,
  DataTable,
  ExportButton,
  Field,
  Spinner,
  ErrorNote,
  MoneyCell,
  formatNumber,
  formatCurrency,
  formatPointsAsCop,
  inputClass,
  type Column,
} from "@/components/admin/ui";
import { ColumnChart, OrdinalBarList } from "@/components/admin/charts";
import { COP_PER_POINT } from "@/lib/points";
import {
  useRefreshToken,
  useReport,
  csvHref,
  monthLabels,
  type PointsData,
  type PointsMonthRow,
} from "./shared";

/**
 * Ciclo de vida de los puntos del programa.
 *
 * Todo lo que se cargó está hoy en uno de tres sitios: disponible, ya
 * redimido o vencido sin usar. El informe se ordena alrededor de esa
 * identidad, y por eso el descuadre —que debería ser cero— se muestra en vez
 * de esconderse.
 */
export default function PuntosSection() {
  const refreshToken = useRefreshToken();
  const [meses, setMeses] = useState("12");

  const filterQuery = useMemo(() => `meses=${meses}`, [meses]);

  const { data, loading, error } = useReport<PointsData>(
    `/api/admin/reports/points?${filterQuery}`,
    refreshToken
  );

  const columns: Column<PointsMonthRow>[] = [
    {
      key: "mes",
      header: "Mes",
      render: (row) => (
        <div>
          <p className="font-medium text-[#0b0b0b]">{monthLabels(row.mes).full}</p>
          <p className="text-xs text-[#52514e]">
            {formatNumber(row.lotes)} lotes
          </p>
        </div>
      ),
    },
    {
      key: "cargados",
      header: "Cargado",
      numeric: true,
      render: (row) => <MoneyCell points={row.cargados} />,
    },
    {
      key: "vivos",
      header: "Sigue disponible",
      numeric: true,
      render: (row) => <MoneyCell points={row.vivos} tone="accent" />,
    },
    {
      key: "vencidos",
      header: "Vencido",
      numeric: true,
      render: (row) =>
        row.vencidos > 0 ? (
          <MoneyCell points={row.vencidos} tone="critical" />
        ) : (
          <span className="text-[#898781]">—</span>
        ),
    },
  ];

  const serie = (data?.serieMensual ?? []).map((row) => {
    const { short, full } = monthLabels(row.mes);
    return {
      label: short,
      fullLabel: full,
      value: row.cargados,
      display: formatPointsAsCop(row.cargados),
      valueHint: `${formatNumber(row.cargados)} puntos`,
      secondary: row.lotes,
      secondaryLabel: row.lotes === 1 ? "lote" : "lotes",
    };
  });

  // Reparto de lo cargado: los tres destinos posibles de un punto
  const destino = data
    ? [
        {
          label: "Disponibles",
          value: data.resumen.disponibles,
          display: formatPointsAsCop(data.resumen.disponibles),
          hint: `${formatNumber(data.resumen.disponibles)} puntos`,
        },
        {
          label: "Redimidos",
          value: data.resumen.redimidos,
          display: formatPointsAsCop(data.resumen.redimidos),
          hint: `${formatNumber(data.resumen.redimidos)} puntos`,
        },
        {
          label: "Vencidos sin usar",
          value: data.resumen.vencidos,
          display: formatPointsAsCop(data.resumen.vencidos),
          hint: `${formatNumber(data.resumen.vencidos)} puntos`,
          critical: true,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Periodo"
        actions={<ExportButton href={csvHref("/api/admin/reports/points", filterQuery)} />}
      >
        <div className="flex flex-wrap gap-3">
          <Field label="Meses en la serie">
            <select
              className={inputClass}
              value={meses}
              onChange={(event) => setMeses(event.target.value)}
            >
              <option value="12">Últimos 12 meses</option>
              <option value="24">Últimos 24 meses</option>
              <option value="36">Últimos 36 meses</option>
            </select>
          </Field>
        </div>
      </Panel>

      {error && <ErrorNote message={error} />}
      {loading && !data && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Cargado"
              value={data.resumen.cargados}
              money
              hint={`${formatNumber(data.resumen.lotes)} lotes · ${formatNumber(
                data.resumen.afiliados
              )} afiliados`}
            />
            <StatTile
              label="Disponible"
              value={data.resumen.disponibles}
              money
              hint="Todavía redimible"
              tone="accent"
            />
            <StatTile
              label="Redimido"
              value={data.resumen.redimidos}
              money
              hint="Ya canjeado por bonos"
            />
            <StatTile
              label="Vencido"
              value={data.resumen.vencidos}
              money
              hint="Caducó sin usarse"
              tone="critical"
            />
          </div>

          <Panel
            title="Dónde está lo que se cargó"
            description="Todo punto cargado está disponible, redimido o vencido. Las tres cifras suman el total."
          >
            <OrdinalBarList bars={destino} valueLabel="puntos" />
            {data.resumen.descuadre !== 0 && (
              <p className="mt-4 text-xs font-medium text-[#d03b3b]">
                Los lotes no cuadran por {formatNumber(data.resumen.descuadre)} puntos
                frente al total cargado. Revisar los lotes en el CRM.
              </p>
            )}
          </Panel>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile
              label={`Vence en menos de ${data.resumen.riesgoDias} días`}
              value={data.resumen.enRiesgo}
              money
              hint="Saldo vivo en riesgo de perderse"
              tone="critical"
            />
            <StatTile
              label="Consumo del programa"
              value={`${(
                (data.resumen.redimidos / (data.resumen.cargados || 1)) *
                100
              ).toFixed(1)} %`}
              hint="Parte de lo cargado que los afiliados ya canjearon"
            />
          </div>

          <Panel
            title="Valor cargado por mes"
            description="Por fecha de entrega del lote. Pasa el cursor sobre una columna para ver el detalle."
          >
            <ColumnChart points={serie} valueLabel="cargados" />
          </Panel>

          <Panel
            title="Detalle por mes"
            description="De lo cargado en cada mes, cuánto sigue vivo y cuánto se perdió."
          >
            <DataTable
              columns={columns}
              rows={data.serieMensual}
              rowKey={(row) => row.mes}
            />
          </Panel>

          <Panel
            title="Lotes por estado en el CRM"
            description="Estado del lote en el subformulario de puntos"
          >
            <DataTable
              rows={data.porEstado}
              rowKey={(row) => row.estado}
              columns={[
                { key: "estado", header: "Estado", render: (row) => row.estado },
                {
                  key: "lotes",
                  header: "Lotes",
                  numeric: true,
                  render: (row) => formatNumber(row.lotes),
                },
                {
                  key: "puntos",
                  header: "Cargado",
                  numeric: true,
                  render: (row) => <MoneyCell points={row.puntos} />,
                },
              ]}
            />
          </Panel>

          <p className="text-xs text-[#898781]">
            Un punto se considera vencido cuando su lote pasó la fecha de
            vencimiento con saldo sin usar. El consumo se imputa a los lotes más
            antiguos primero, que es la regla del programa. Los valores en pesos
            usan la equivalencia del programa: 1 punto ={" "}
            {formatCurrency(COP_PER_POINT)}.
          </p>
        </>
      )}
    </div>
  );
}
