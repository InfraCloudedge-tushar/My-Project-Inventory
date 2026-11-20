import React, { useMemo, useState } from 'react';
import {
  DailySimulationPoint,
  StrategyId,
  StrategySimulationResult,
} from '../types/supplyChain';
import { formatNumber } from '../utils/formatters';

interface InventorySimulationChartProps {
  strategies: Record<StrategyId, StrategySimulationResult>;
  activeStrategy: StrategyId;
  onSelectStrategy: (id: StrategyId) => void;
  safetyStockModules: number;
  siteLaydownCapModules: number;
  installStartDay: number;
}

export const InventorySimulationChart: React.FC<InventorySimulationChartProps> = ({
  strategies,
  activeStrategy,
  onSelectStrategy,
  safetyStockModules,
  siteLaydownCapModules,
  installStartDay,
}) => {
  const [hoverDayIdx, setHoverDayIdx] = useState<number | null>(null);
  const [showCompareDirect, setShowCompareDirect] = useState<boolean>(true);

  const primary = strategies[activeStrategy];
  const directSeries = strategies.direct.dailySeries;
  const series = primary.dailySeries;

  const width = 920;
  const height = 340;
  const pad = { top: 24, right: 24, bottom: 40, left: 68 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxY = useMemo(() => {
    let m = Math.max(safetyStockModules * 1.25, siteLaydownCapModules * 1.15, 10000);
    for (let i = 0; i < series.length; i++) {
      m = Math.max(
        m,
        series[i].p90OnHand,
        series[i].totalOnHand,
        directSeries[i]?.totalOnHand ?? 0
      );
    }
    // Round up nicely to nearest 10,000
    return Math.ceil(m / 10000) * 10000;
  }, [series, directSeries, safetyStockModules, siteLaydownCapModules]);

  const maxDay = series.length > 0 ? series[series.length - 1].day : 180;

  const xScale = (day: number) =>
    pad.left + ((day - 1) / Math.max(1, maxDay - 1)) * plotW;
  const yScale = (val: number) =>
    pad.top + plotH - (Math.min(maxY, Math.max(0, val)) / maxY) * plotH;

  // Build SVG paths
  const p90P10BandPath = useMemo(() => {
    if (series.length === 0) return '';
    const upper = series
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(pt.day).toFixed(1)} ${yScale(pt.p90OnHand).toFixed(1)}`)
      .join(' ');
    const lower = [...series]
      .reverse()
      .map((pt) => `L ${xScale(pt.day).toFixed(1)} ${yScale(pt.p10OnHand).toFixed(1)}`)
      .join(' ');
    return `${upper} ${lower} Z`;
  }, [series, maxY, maxDay]);

  const makeLinePath = (pts: DailySimulationPoint[], accessor: (p: DailySimulationPoint) => number) =>
    pts
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${xScale(pt.day).toFixed(1)} ${yScale(accessor(pt)).toFixed(1)}`
      )
      .join(' ');

  const primaryLinePath = useMemo(() => makeLinePath(series, (p) => p.totalOnHand), [series, maxY, maxDay]);
  const directLinePath = useMemo(
    () => makeLinePath(directSeries, (p) => p.totalOnHand),
    [directSeries, maxY, maxDay]
  );

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxY * t));
  const xTickStep = maxDay <= 140 ? 20 : 30;
  const xTicks: number[] = [];
  for (let d = 1; d <= maxDay; d += xTickStep) xTicks.push(d);

  const hoveredPoint =
    hoverDayIdx !== null && series[hoverDayIdx] ? series[hoverDayIdx] : null;
  const hoveredDirect =
    hoverDayIdx !== null && directSeries[hoverDayIdx] ? directSeries[hoverDayIdx] : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(pad.left, Math.min(width - pad.right, relX));
    const ratio = (clampedX - pad.left) / plotW;
    const idx = Math.min(series.length - 1, Math.max(0, Math.round(ratio * (series.length - 1))));
    setHoverDayIdx(idx);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Daily Inventory & Buffer-Stock Simulation Trajectory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monte Carlo mean on-hand modules with P10–P90 stochastic variability envelope across lead-time & bottleneck trials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Strategy Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['warehouse', 'hybrid', 'direct'] as StrategyId[]).map((sid) => (
              <button
                key={sid}
                type="button"
                onClick={() => onSelectStrategy(sid)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeStrategy === sid
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sid === 'warehouse'
                  ? 'Regional Warehouse'
                  : sid === 'hybrid'
                    ? 'Hybrid Buffer'
                    : 'Direct-to-Site'}
              </button>
            ))}
          </div>

          {activeStrategy !== 'direct' && (
            <button
              type="button"
              onClick={() => setShowCompareDirect((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showCompareDirect
                  ? 'border-slate-300 bg-slate-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
              }`}
            >
              {showCompareDirect ? 'Hide Direct Overlay' : 'Compare Direct-to-Site'}
            </button>
          )}
        </div>
      </div>

      {/* Legend Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-amber-600 inline-block" />
            <span>{primary.strategyLabel} (Mean On-Hand)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-2.5 bg-amber-500/20 border border-amber-500/30 inline-block rounded-xs" />
            <span>P10–P90 Monte Carlo Band</span>
          </span>
          {showCompareDirect && activeStrategy !== 'direct' && (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-0.5 bg-slate-500 border-b border-dashed border-slate-500 inline-block" />
              <span>Direct-to-Site Baseline</span>
            </span>
          )}
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-0 border-t-2 border-dashed border-emerald-600 inline-block" />
            <span>Safety Stock ({formatNumber(safetyStockModules)} mod)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-0 border-t border-dotted border-red-600 inline-block" />
            <span>Site Laydown Cap ({formatNumber(siteLaydownCapModules)} mod)</span>
          </span>
        </div>

        {/* Live Scrubber Readout */}
        <div className="font-mono tabular-nums text-xs text-slate-700">
          {hoveredPoint ? (
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900">{hoveredPoint.dateLabel}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>On-Hand: <strong>{formatNumber(hoveredPoint.totalOnHand)}</strong></span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500">
                P10–P90: {formatNumber(hoveredPoint.p10OnHand)}–{formatNumber(hoveredPoint.p90OnHand)}
              </span>
              {hoveredPoint.stockoutModules > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-red-700 font-semibold">
                    Stockout: -{formatNumber(hoveredPoint.stockoutModules)}
                  </span>
                </>
              )}
              {hoveredDirect && activeStrategy !== 'direct' && showCompareDirect && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-500">
                    Direct: {formatNumber(hoveredDirect.totalOnHand)}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-slate-400">Hover chart to inspect daily inventory & stockout risk</span>
          )}
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="mt-3 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverDayIdx(null)}
        >
          {/* Horizontal Gridlines */}
          {yTicks.map((tick) => {
            const y = yScale(tick);
            return (
              <g key={tick}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={width - pad.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth={1}
                />
                <text
                  x={pad.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px] font-mono tabular-nums"
                >
                  {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
                </text>
              </g>
            );
          })}

          {/* X Axis Ticks */}
          {xTicks.map((d) => {
            const x = xScale(d);
            const pt = series[d - 1];
            const tickLabel = pt ? pt.compactDateLabel : `Day ${d}`;
            return (
              <g key={d}>
                <line
                  x1={x}
                  y1={pad.top + plotH}
                  x2={x}
                  y2={pad.top + plotH + 5}
                  stroke="#CBD5E1"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={pad.top + plotH + 20}
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px] font-mono tabular-nums"
                >
                  {tickLabel}
                </text>
              </g>
            );
          })}

          {/* Stockout highlight columns */}
          {series.map((pt) => {
            if (pt.stockoutModules <= 20) return null;
            const x = xScale(pt.day);
            const barW = Math.max(2, plotW / series.length);
            return (
              <rect
                key={`so-${pt.day}`}
                x={x - barW / 2}
                y={pad.top}
                width={barW}
                height={plotH}
                fill="#DC2626"
                fillOpacity={0.08}
              />
            );
          })}

          {/* P10-P90 Confidence Band */}
          <path d={p90P10BandPath} fill="#D97706" fillOpacity={0.14} />

          {/* Installation Start Vertical Line */}
          {installStartDay <= maxDay && (
            <g>
              <line
                x1={xScale(installStartDay)}
                y1={pad.top}
                x2={xScale(installStartDay)}
                y2={pad.top + plotH}
                stroke="#0F172A"
                strokeWidth={1}
                strokeDasharray="4 4"
                strokeOpacity={0.55}
              />
              <text
                x={xScale(installStartDay) + 6}
                y={pad.top + 12}
                className="fill-slate-700 text-[10px] font-mono font-medium"
              >
                Install Start ({series[installStartDay - 1]?.compactDateLabel ?? `Day ${installStartDay}`})
              </text>
            </g>
          )}

          {/* Safety Stock Threshold Line */}
          <line
            x1={pad.left}
            y1={yScale(safetyStockModules)}
            x2={width - pad.right}
            y2={yScale(safetyStockModules)}
            stroke="#16A34A"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />

          {/* Site Laydown Cap Line */}
          <line
            x1={pad.left}
            y1={yScale(siteLaydownCapModules)}
            x2={width - pad.right}
            y2={yScale(siteLaydownCapModules)}
            stroke="#DC2626"
            strokeWidth={1.25}
            strokeDasharray="2 3"
          />

          {/* Direct-to-Site Overlay Line */}
          {showCompareDirect && activeStrategy !== 'direct' && (
            <path
              d={directLinePath}
              fill="none"
              stroke="#64748B"
              strokeWidth={1.75}
              strokeDasharray="5 3"
            />
          )}

          {/* Primary Strategy Mean Line */}
          <path
            d={primaryLinePath}
            fill="none"
            stroke="#D97706"
            strokeWidth={2.5}
          />

          {/* Hover Crosshair */}
          {hoveredPoint && (
            <g>
              <line
                x1={xScale(hoveredPoint.day)}
                y1={pad.top}
                x2={xScale(hoveredPoint.day)}
                y2={pad.top + plotH}
                stroke="#0F172A"
                strokeWidth={1}
              />
              <circle
                cx={xScale(hoveredPoint.day)}
                cy={yScale(hoveredPoint.totalOnHand)}
                r={4.5}
                fill="#D97706"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              {hoveredDirect && showCompareDirect && activeStrategy !== 'direct' && (
                <circle
                  cx={xScale(hoveredDirect.day)}
                  cy={yScale(hoveredDirect.totalOnHand)}
                  r={3.5}
                  fill="#64748B"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              )}
            </g>
          )}

          {/* Axis Labels */}
          <text
            x={pad.left + plotW / 2}
            y={height - 4}
            textAnchor="middle"
            className="fill-slate-400 text-[11px]"
          >
            Project Timeline ({series[0]?.dateLabel ?? ''} – {series[series.length - 1]?.dateLabel ?? ''})
          </text>
        </svg>
      </div>
    </section>
  );
};
