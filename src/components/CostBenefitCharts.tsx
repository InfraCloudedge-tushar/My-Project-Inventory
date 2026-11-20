import React, { useState } from 'react';
import {
  SensitivityPoint,
  StrategyId,
  StrategySimulationResult,
} from '../types/supplyChain';
import { formatUSD } from '../utils/formatters';

interface CostBenefitChartsProps {
  strategies: Record<StrategyId, StrategySimulationResult>;
  sensitivityCurve: SensitivityPoint[];
  breakEvenVolatilityMultiplier: number | null;
}

const COST_SEGMENTS: Array<{
  key: keyof Pick<
    StrategySimulationResult,
    | 'procurementAndOceanCostUSD'
    | 'freightAndDrayageCostUSD'
    | 'warehouseLeaseCostUSD'
    | 'warehouseHandlingCostUSD'
    | 'workingCapitalCostUSD'
    | 'portDemurrageCostUSD'
    | 'idleCrewPenaltyCostUSD'
  >;
  label: string;
  color: string;
}> = [
  { key: 'procurementAndOceanCostUSD', label: 'Factory QC & Ocean', color: '#0F172A' },
  { key: 'freightAndDrayageCostUSD', label: 'Inland Freight', color: '#475569' },
  { key: 'warehouseLeaseCostUSD', label: 'Warehouse Lease', color: '#0284C7' },
  { key: 'warehouseHandlingCostUSD', label: 'Double-Handling', color: '#38BDF8' },
  { key: 'workingCapitalCostUSD', label: 'Working Capital', color: '#94A3B8' },
  { key: 'portDemurrageCostUSD', label: 'Port Demurrage', color: '#D97706' },
  { key: 'idleCrewPenaltyCostUSD', label: 'Idle Crew Standby', color: '#DC2626' },
];

export const CostBenefitCharts: React.FC<CostBenefitChartsProps> = ({
  strategies,
  sensitivityCurve,
  breakEvenVolatilityMultiplier,
}) => {
  const [hoveredSensIdx, setHoveredSensIdx] = useState<number | null>(null);

  const ordered: StrategySimulationResult[] = [
    strategies.direct,
    strategies.warehouse,
    strategies.hybrid,
  ];
  const maxTotalCost = Math.max(
    1,
    ...ordered.map((s) => s.totalLogisticsCostUSD)
  );

  // Sensitivity SVG geometry
  const w = 520;
  const h = 255;
  const pad = { top: 20, right: 20, bottom: 38, left: 66 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const sensValues = sensitivityCurve.flatMap((pt) => [
    pt.directTotalLogisticsUSD,
    pt.warehouseTotalLogisticsUSD,
    pt.hybridTotalLogisticsUSD,
  ]);
  const minSens = Math.min(...sensValues) * 0.94;
  const maxSens = Math.max(...sensValues) * 1.04;
  const sensRange = Math.max(1, maxSens - minSens);

  const sx = (idx: number) =>
    pad.left + (idx / Math.max(1, sensitivityCurve.length - 1)) * plotW;
  const sy = (val: number) =>
    pad.top + plotH - ((val - minSens) / sensRange) * plotH;

  const makeSensPath = (accessor: (p: SensitivityPoint) => number) =>
    sensitivityCurve
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(accessor(pt)).toFixed(1)}`
      )
      .join(' ');

  const hoveredSens =
    hoveredSensIdx !== null ? sensitivityCurve[hoveredSensIdx] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Stacked Logistics Cost Breakdown */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Total Logistics Cost Breakdown by Strategy
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Excludes raw PV module hardware price to isolate freight, warehousing, demurrage, and crew idle costs.
          </p>
        </div>

        <div className="mt-5 space-y-5">
          {ordered.map((st) => {
            const widthPct = (st.totalLogisticsCostUSD / maxTotalCost) * 100;
            return (
              <div key={st.strategyId}>
                <div className="flex items-baseline justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-900">
                    {st.strategyLabel}
                  </span>
                  <span className="font-mono tabular-nums text-slate-700">
                    <strong className="text-slate-900">
                      {formatUSD(st.totalLogisticsCostUSD)}
                    </strong>{' '}
                    <span className="text-slate-400">
                      (${st.logisticsCostPerWpUSD.toFixed(4)}/Wp)
                    </span>
                  </span>
                </div>

                {/* Stacked Bar */}
                <div className="h-7 w-full bg-slate-100 rounded-md overflow-hidden flex">
                  <div
                    className="h-full flex overflow-hidden rounded-md"
                    style={{ width: `${widthPct}%` }}
                  >
                    {COST_SEGMENTS.map((seg) => {
                      const val = st[seg.key];
                      if (val <= 0) return null;
                      const segPct = (val / st.totalLogisticsCostUSD) * 100;
                      return (
                        <div
                          key={seg.key}
                          title={`${seg.label}: ${formatUSD(val)}`}
                          style={{
                            width: `${segPct}%`,
                            backgroundColor: seg.color,
                          }}
                          className="h-full border-r border-white/20 last:border-r-0"
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums text-slate-500">
                  <span>Continuity: {st.installationContinuityPct}%</span>
                  <span aria-hidden="true">·</span>
                  <span>Demurrage: {formatUSD(st.portDemurrageCostUSD)}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      st.idleCrewPenaltyCostUSD > 80000
                        ? 'text-red-700 font-medium'
                        : 'text-slate-500'
                    }
                  >
                    Idle Crew: {formatUSD(st.idleCrewPenaltyCostUSD)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Segment Legend */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-600">
          {COST_SEGMENTS.map((seg) => (
            <span key={seg.key} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-xs inline-block"
                style={{ backgroundColor: seg.color }}
              />
              <span>{seg.label}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Right: Lead-Time Volatility Sensitivity & Break-Even Curve */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Lead-Time Volatility Sensitivity & Break-Even
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Total logistics cost across 0.4x (calm) to 2.0x (disrupted) lead-time variance & bottleneck shocks.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-700">
            Break-even:{' '}
            <strong className="text-amber-700">
              {breakEvenVolatilityMultiplier !== null
                ? `${breakEvenVolatilityMultiplier}x volatility`
                : 'Direct stays cheaper'}
            </strong>
          </div>
        </div>

        {/* Legend & Hover Readout */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-600 inline-block" />
              <span>Direct-to-Site</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-600 inline-block" />
              <span>Regional Warehouse</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-600 inline-block" />
              <span>Hybrid Buffer</span>
            </span>
          </div>

          <div className="font-mono tabular-nums text-[11px] text-slate-700">
            {hoveredSens ? (
              <span>
                {hoveredSens.label}: Direct{' '}
                <strong>{formatUSD(hoveredSens.directTotalLogisticsUSD, true)}</strong> ·
                WH <strong>{formatUSD(hoveredSens.warehouseTotalLogisticsUSD, true)}</strong> ·
                Hybrid <strong>{formatUSD(hoveredSens.hybridTotalLogisticsUSD, true)}</strong>
              </span>
            ) : (
              <span className="text-slate-400">Hover nodes for exact values</span>
            )}
          </div>
        </div>

        <div className="mt-2">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto select-none">
            {/* Y Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const val = minSens + sensRange * t;
              const y = sy(val);
              return (
                <g key={t}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={w - pad.right}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth={1}
                  />
                  <text
                    x={pad.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {formatUSD(val, true)}
                  </text>
                </g>
              );
            })}

            {/* Current Baseline Marker (1.0x is index 2) */}
            <line
              x1={sx(2)}
              y1={pad.top}
              x2={sx(2)}
              y2={pad.top + plotH}
              stroke="#0F172A"
              strokeDasharray="3 3"
              strokeOpacity={0.35}
            />
            <text
              x={sx(2) + 4}
              y={pad.top + 11}
              className="fill-slate-600 text-[10px] font-mono"
            >
              Current (1.0x)
            </text>

            {/* Lines */}
            <path
              d={makeSensPath((p) => p.directTotalLogisticsUSD)}
              fill="none"
              stroke="#DC2626"
              strokeWidth={2.25}
            />
            <path
              d={makeSensPath((p) => p.warehouseTotalLogisticsUSD)}
              fill="none"
              stroke="#0284C7"
              strokeWidth={2.25}
            />
            <path
              d={makeSensPath((p) => p.hybridTotalLogisticsUSD)}
              fill="none"
              stroke="#D97706"
              strokeWidth={2.25}
            />

            {/* Interactive Points & X Labels */}
            {sensitivityCurve.map((pt, idx) => {
              const cx = sx(idx);
              return (
                <g
                  key={pt.label}
                  onMouseEnter={() => setHoveredSensIdx(idx)}
                  onMouseLeave={() => setHoveredSensIdx(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={cx - 24}
                    y={pad.top}
                    width={48}
                    height={plotH}
                    fill="transparent"
                  />
                  <circle
                    cx={cx}
                    cy={sy(pt.directTotalLogisticsUSD)}
                    r={hoveredSensIdx === idx ? 4.5 : 3}
                    fill="#DC2626"
                  />
                  <circle
                    cx={cx}
                    cy={sy(pt.warehouseTotalLogisticsUSD)}
                    r={hoveredSensIdx === idx ? 4.5 : 3}
                    fill="#0284C7"
                  />
                  <circle
                    cx={cx}
                    cy={sy(pt.hybridTotalLogisticsUSD)}
                    r={hoveredSensIdx === idx ? 4.5 : 3}
                    fill="#D97706"
                  />
                  <text
                    x={cx}
                    y={pad.top + plotH + 18}
                    textAnchor="middle"
                    className="fill-slate-600 text-[10px] font-mono tabular-nums"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}

            <text
              x={pad.left + plotW / 2}
              y={h - 4}
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              Lead-Time Variance & Bottleneck Multiplier
            </text>
          </svg>
        </div>
      </section>
    </div>
  );
};
