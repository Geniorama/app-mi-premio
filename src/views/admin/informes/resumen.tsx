"use client";

import {
  StatTile,
  Panel,
  DataTable,
  StatusPill,
  Spinner,
  ErrorNote,
  formatNumber,
  formatCurrency,
  formatPointsAsCop,
  MoneyCell,
  formatDateTime,
} from "@/components/admin/ui";
import { ColumnChart } from "@/components/admin/charts";
import { COP_PER_POINT } from "@/lib/points";
import {
  useRefreshToken,
  useReport,
  monthLabels,
  type OverviewData,
} from "./shared";

export default function ResumenSection() {
  const refreshToken = useRefreshToken();

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
      display: formatPointsAsCop(point.puntos),
      valueHint: `${formatNumber(point.puntos)} puntos`,
      secondary: point.redenciones,
      secondaryLabel: point.redenciones === 1 ? "redención" : "redenciones",
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Entregado"
          value={totals.puntosEntregados}
          money
          hint="Acumulado histórico del programa"
        />
        <StatTile
          label="Redimido"
          value={totals.puntosRedimidos}
          money
          hint={`En ${formatNumber(totals.redenciones)} redenciones`}
          tone="accent"
        />
        <StatTile
          label="Saldo en circulación"
          value={totals.saldoDisponible}
          money
          hint={`${formatNumber(totals.afiliadosConSaldo)} afiliados con saldo`}
        />
        <StatTile
          label="Vencido"
          value={totals.puntosVencidos}
          money
          hint="Ya no son redimibles"
          tone="critical"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Afiliados"
          value={totals.afiliados}
          hint={`${formatNumber(
            totals.afiliadosConMembresia
          )} con membresía · ${formatNumber(totals.afiliadosSinMembresia)} sin`}
        />
        <StatTile label="Membresías" value={totals.membresias} hint="Padre + ciclos hija" />
        <StatTile label="Por vencer" value={totals.puntosPorVencer} money />
        <StatTile
          label="Redenciones desde la web"
          value={`${formatNumber(data.cobertura.redencionesAuditadas)} / ${formatNumber(data.cobertura.redencionesZoho)}`}
          hint="El resto se creó directamente en el CRM"
        />
      </div>

      <Panel
        title="Valor redimido por mes"
        description="Últimos 12 meses. Pasa el cursor sobre una columna para ver el detalle."
      >
        <ColumnChart points={puntos} valueLabel="redimidos" />
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
                key: "valor",
                header: "Valor",
                numeric: true,
                render: ([estado]) => (
                  <MoneyCell points={totals.puntosPorEstado[estado] ?? 0} />
                ),
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
                key: "valor",
                header: "Valor",
                numeric: true,
                render: (row) => <MoneyCell points={row.puntos} />,
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
              key: "valor",
              header: "Redimido",
              numeric: true,
              render: (row) => (
                <MoneyCell points={row.puntosRedimidos} tone="accent" />
              ),
            },
          ]}
        />
      </Panel>

      <p className="text-xs text-[#898781]">
        Los valores en pesos usan la equivalencia del programa: 1 punto ={" "}
        {formatCurrency(COP_PER_POINT)}. Informe generado el{" "}
        {formatDateTime(data.generadoEn)}.
      </p>
    </div>
  );
}
