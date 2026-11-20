import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import {
  MonthlySimulationPoint,
  StrategyId,
  StrategySimulationResult,
} from '../types/supplyChain';
import { formatNumber, formatUSD } from '../utils/formatters';

interface MonthlyComparisonChartProps {
  strategies: Record<StrategyId, StrategySimulationResult>;
  activeStrategy: StrategyId;
  onSelectStrategy: (id: StrategyId) => void;
}

type MonthlyMetricKey =
  | 'modulesInstalled'
  | 'modulesArrived'
  | 'avgOnHandInventory'
  | 'monthlyLogisticsCostUSD'
  | 'stockoutModules';

interface MetricConfig {
  key: MonthlyMetricKey;
  label: string;
  unit: string;
  primaryColor: string;
  previousColor: string;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'modulesInstalled',
    label: 'Modules Installed',
    unit: 'modules',
    primaryColor: '#059669', // Emerald
    previousColor: '#94A3B8',
    format: (v) => formatNumber(v),
  },
  {
    key: 'modulesArrived',
    label: 'Modules Arrived',
    unit: 'modules',
    primaryColor: '#0284C7', // Sky Blue
    previousColor: '#94A3B8',
    format: (v) => formatNumber(v),
  },
  {
    key: 'avgOnHandInventory',
    label: 'Avg On-Hand Buffer',
    unit: 'modules',
    primaryColor: '#D97706', // Solar Amber
    previousColor: '#94A3B8',
    format: (v) => formatNumber(v),
  },
  {
    key: 'monthlyLogisticsCostUSD',
    label: 'Monthly Logistics Spend',
    unit: 'USD',
    primaryColor: '#4F46E5', // Indigo
    previousColor: '#94A3B8',
    format: (v) => formatUSD(v),
    lowerIsBetter: true,
  },
  {
    key: 'stockoutModules',
    label: 'Stockout Shortfall',
    unit: 'modules',
    primaryColor: '#DC2626', // Crimson
    previousColor: '#94A3B8',
    format: (v) => formatNumber(v),
    lowerIsBetter: true,
  },
];

// Vibrant distinct palette for colorful horizontal bars when viewing monthly progression
const MONTH_COLORS = [
  '#0284C7', // Sky
  '#0D9488', // Teal
  '#059669', // Emerald
  '#D97706', // Amber
  '#EA580C', // Orange
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#DB2777', // Rose
];

export const MonthlyComparisonChart: React.FC<MonthlyComparisonChartProps> = ({
  strategies,
  activeStrategy,
  onSelectStrategy,
}) => {
  const [selectedMetric, setSelectedMetric] =
    useState<MonthlyMetricKey>('modulesInstalled');
  const [comparePrevMonth, setComparePrevMonth] = useState<boolean>(true);
  const [focusMonthNum, setFocusMonthNum] = useState<number>(3);

  const strategyResult = strategies[activeStrategy];
  const monthlySeries = strategyResult.monthlySeries;

  const metricCfg =
    METRIC_CONFIGS.find((m) => m.key === selectedMetric) ?? METRIC_CONFIGS[0];

  const effectiveFocusMonth = Math.min(
    monthlySeries.length,
    Math.max(1, focusMonthNum)
  );
  const currentMonthObj: MonthlySimulationPoint | undefined =
    monthlySeries[effectiveFocusMonth - 1];
  const prevMonthObj: MonthlySimulationPoint | undefined =
    effectiveFocusMonth > 1 ? monthlySeries[effectiveFocusMonth - 2] : undefined;

  const maxMetricVal = useMemo(() => {
    let m = 1;
    for (const row of monthlySeries) {
      m = Math.max(m, row[selectedMetric]);
    }
    return m;
  }, [monthlySeries, selectedMetric]);

  const renderDeltaBadge = (
    curr: number,
    prev: number | undefined,
    lowerIsBetter = false,
    formatter: (v: number) => string = formatNumber
  ) => {
    if (prev === undefined) {
      return <span className="text-[11px] text-slate-400 font-mono">Start Month</span>;
    }
    const diff = curr - prev;
    const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : curr > 0 ? '100.0' : '0.0';
    const isPositive = diff > 0;
    const isGood = lowerIsBetter ? diff < 0 : diff > 0;
    const isNeutral = diff === 0;

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums font-medium ${
          isNeutral
            ? 'text-slate-500'
            : isGood
              ? 'text-emerald-700'
              : 'text-red-700'
        }`}
      >
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isPositive ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        <span>
          {diff > 0 ? '+' : ''}
          {formatter(diff)} ({diff > 0 ? '+' : ''}
          {pct}%)
        </span>
      </span>
    );
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Month-Wise Supply Chain Performance & Previous-Month Comparison
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Horizontal color-coded monthly breakdown with side-by-side Month-over-Month (MoM) variance tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Strategy Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['warehouse', 'hybrid', 'direct'] as StrategyId[]).map((sid) => (
              <button
                key={sid}
                type="button"
                onClick={() => onSelectStrategy(sid)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeStrategy === sid
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sid === 'warehouse'
                  ? 'Warehouse'
                  : sid === 'hybrid'
                    ? 'Hybrid'
                    : 'Direct'}
              </button>
            ))}
          </div>

          {/* Compare Previous Month Toggle */}
          <button
            type="button"
            onClick={() => setComparePrevMonth((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              comparePrevMonth
                ? 'border-amber-600 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {comparePrevMonth
              ? 'Comparing vs. Previous Month: ON'
              : 'Compare vs. Previous Month'}
          </button>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {METRIC_CONFIGS.map((cfg) => {
            const active = cfg.key === selectedMetric;
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => setSelectedMetric(cfg.key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: cfg.primaryColor }}
                />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Focus Month Selector for MoM Deep Dive */}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="focus-month-select" className="text-slate-500 font-medium">
            Inspect Month:
          </label>
          <select
            id="focus-month-select"
            value={effectiveFocusMonth}
            onChange={(e) => setFocusMonthNum(Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-amber-600"
          >
            {monthlySeries.map((m) => (
              <option key={m.month} value={m.month}>
                {m.monthLabel} ({m.dayRangeLabel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Month vs. Previous Month Scorecard Strip */}
      {currentMonthObj && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 bg-slate-50/80 border border-slate-200 rounded-lg">
          <div>
            <div className="text-[11px] text-slate-500">
              {currentMonthObj.monthLabel} Arrived vs. {prevMonthObj ? prevMonthObj.monthLabel : 'Start'}
            </div>
            <div className="mt-1 text-base font-mono tabular-nums font-semibold text-slate-900">
              {formatNumber(currentMonthObj.modulesArrived)} mod
            </div>
            <div className="mt-0.5">
              {renderDeltaBadge(
                currentMonthObj.modulesArrived,
                prevMonthObj?.modulesArrived,
                false,
                formatNumber
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500">
              {currentMonthObj.monthLabel} Installed vs. {prevMonthObj ? prevMonthObj.monthLabel : 'Start'}
            </div>
            <div className="mt-1 text-base font-mono tabular-nums font-semibold text-slate-900">
              {formatNumber(currentMonthObj.modulesInstalled)} mod
            </div>
            <div className="mt-0.5">
              {renderDeltaBadge(
                currentMonthObj.modulesInstalled,
                prevMonthObj?.modulesInstalled,
                false,
                formatNumber
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500">
              {currentMonthObj.monthLabel} Avg Buffer vs. {prevMonthObj ? prevMonthObj.monthLabel : 'Start'}
            </div>
            <div className="mt-1 text-base font-mono tabular-nums font-semibold text-slate-900">
              {formatNumber(currentMonthObj.avgOnHandInventory)} mod
            </div>
            <div className="mt-0.5">
              {renderDeltaBadge(
                currentMonthObj.avgOnHandInventory,
                prevMonthObj?.avgOnHandInventory,
                false,
                formatNumber
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500">
              {currentMonthObj.monthLabel} Spend vs. {prevMonthObj ? prevMonthObj.monthLabel : 'Start'}
            </div>
            <div className="mt-1 text-base font-mono tabular-nums font-semibold text-slate-900">
              {formatUSD(currentMonthObj.monthlyLogisticsCostUSD)}
            </div>
            <div className="mt-0.5">
              {renderDeltaBadge(
                currentMonthObj.monthlyLogisticsCostUSD,
                prevMonthObj?.monthlyLogisticsCostUSD,
                true,
                formatUSD
              )}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Colorful Bar Chart */}
      <div className="mt-6 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pb-1">
          <span className="font-medium text-slate-700">
            Horizontal Monthly Comparison — {metricCfg.label}
          </span>
          {comparePrevMonth && (
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-3 h-2.5 rounded-xs inline-block"
                  style={{ backgroundColor: metricCfg.primaryColor }}
                />
                <span>Current Month</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded-xs bg-slate-400/80 inline-block" />
                <span>Previous Month</span>
              </span>
            </div>
          )}
        </div>

        {monthlySeries.map((row, idx) => {
          const val = row[selectedMetric];
          const prevRow = idx > 0 ? monthlySeries[idx - 1] : undefined;
          const prevVal = prevRow ? prevRow[selectedMetric] : 0;
          const widthPct = Math.max(0, (val / maxMetricVal) * 100);
          const prevWidthPct = Math.max(0, (prevVal / maxMetricVal) * 100);
          const barColor = comparePrevMonth
            ? metricCfg.primaryColor
            : MONTH_COLORS[idx % MONTH_COLORS.length];
          const isFocused = row.month === effectiveFocusMonth;

          return (
            <div
              key={row.month}
              onClick={() => setFocusMonthNum(row.month)}
              className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                isFocused
                  ? 'border-amber-500 bg-amber-50/30'
                  : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Month Label */}
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-slate-900">
                    {row.monthLabel}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {row.dayRangeLabel}
                  </div>
                </div>

                {/* Horizontal Bars */}
                <div className="md:col-span-7 space-y-1.5">
                  <div className="h-5 w-full bg-slate-100 rounded overflow-hidden flex items-center">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>

                  {comparePrevMonth && prevRow && (
                    <div className="h-2.5 w-full bg-slate-100/70 rounded overflow-hidden flex items-center">
                      <div
                        className="h-full rounded bg-slate-400/80 transition-all duration-300"
                        style={{
                          width: `${prevWidthPct}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Value & Previous-Month Delta */}
                <div className="md:col-span-3 text-left md:text-right">
                  <div className="text-xs font-mono tabular-nums font-semibold text-slate-900">
                    {metricCfg.format(val)}
                    {metricCfg.unit !== 'USD' ? ` ${metricCfg.unit}` : ''}
                  </div>
                  <div className="mt-0.5">
                    {renderDeltaBadge(
                      val,
                      prevRow ? prevVal : undefined,
                      metricCfg.lowerIsBetter,
                      metricCfg.format
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Month-by-Month Ledger Table */}
      <div className="mt-6 pt-5 border-t border-slate-100 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
              <th className="py-2 pr-3">Month</th>
              <th className="py-2 px-3 text-right">Arrived</th>
              <th className="py-2 px-3 text-right">Installed</th>
              <th className="py-2 px-3 text-right">MoM Install Δ</th>
              <th className="py-2 px-3 text-right">Avg Buffer</th>
              <th className="py-2 px-3 text-right">Stockout</th>
              <th className="py-2 pl-3 text-right">Monthly Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {monthlySeries.map((row, idx) => {
              const prev = idx > 0 ? monthlySeries[idx - 1] : undefined;
              return (
                <tr
                  key={row.month}
                  onClick={() => setFocusMonthNum(row.month)}
                  className={`cursor-pointer transition-colors ${
                    row.month === effectiveFocusMonth
                      ? 'bg-amber-50/50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2.5 pr-3 font-medium text-slate-900">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-xs inline-block"
                        style={{
                          backgroundColor: MONTH_COLORS[idx % MONTH_COLORS.length],
                        }}
                      />
                      <span>{row.monthLabel}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({row.dayRangeLabel})
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sky-700 font-medium">
                    {formatNumber(row.modulesArrived)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                    {formatNumber(row.modulesInstalled)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {renderDeltaBadge(
                      row.modulesInstalled,
                      prev?.modulesInstalled,
                      false,
                      formatNumber
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                    {formatNumber(row.avgOnHandInventory)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-700">
                    {row.stockoutModules > 0 ? formatNumber(row.stockoutModules) : '0'}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums font-medium text-slate-900">
                    {formatUSD(row.monthlyLogisticsCostUSD)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
