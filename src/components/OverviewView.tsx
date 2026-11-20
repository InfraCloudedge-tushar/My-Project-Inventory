import React from 'react';
import {
  SimulationOutput,
  StageKey,
  StrategyId,
  SupplyChainModelInput,
  SupplyChainStage,
} from '../types/supplyChain';
import { formatDecimal, formatNumber, formatUSD } from '../utils/formatters';
import { SupplyChainPipeline } from './SupplyChainPipeline';
import { InventorySimulationChart } from './InventorySimulationChart';
import { MonthlyComparisonChart } from './MonthlyComparisonChart';

interface OverviewViewProps {
  input: SupplyChainModelInput;
  output: SimulationOutput;
  activeStrategy: StrategyId;
  onSelectStrategy: (id: StrategyId) => void;
  onUpdateStage: (stageId: StageKey, patch: Partial<SupplyChainStage>) => void;
}

const STAGE_BAR_COLORS: Record<StageKey, string> = {
  procurement: '#4F46E5', // Indigo
  ocean: '#0284C7',       // Sky Blue
  port: '#D97706',        // Solar Amber
  drayage: '#059669',     // Emerald
  staging: '#0D9488',     // Teal
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  input,
  output,
  activeStrategy,
  onSelectStrategy,
  onUpdateStage,
}) => {
  const { bufferMetrics, strategies, stageAttribution, recommendedStrategy, maxSavingsUSD } =
    output;
  const activeResult = strategies[activeStrategy];
  const directResult = strategies.direct;
  const recommendedResult = strategies[recommendedStrategy];

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">
            Optimal Buffer Safety Stock ({input.params.targetServiceLevelPct}% CSL)
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-2xl font-semibold text-slate-900">
              {formatNumber(bufferMetrics.safetyStockModules)}
            </span>
            <span className="text-xs text-slate-500">modules</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 font-mono tabular-nums">
            {bufferMetrics.safetyStockDays} days supply ·{' '}
            {bufferMetrics.recommendedWarehouseContainers} containers cap
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">
            Installation Continuity ({activeResult.strategyLabel})
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span
              className={`text-2xl font-semibold ${
                activeResult.installationContinuityPct >= 97
                  ? 'text-emerald-700'
                  : activeResult.installationContinuityPct >= 92
                    ? 'text-amber-700'
                    : 'text-red-700'
              }`}
            >
              {formatDecimal(activeResult.installationContinuityPct, 1)}%
            </span>
            <span className="text-xs text-slate-500">uptime</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 font-mono tabular-nums">
            {activeResult.avgStockoutDays} avg stockout days · vs.{' '}
            {directResult.avgStockoutDays}d direct
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">
            Recommended Strategy Cost Advantage
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-2xl font-semibold text-slate-900">
              {formatUSD(maxSavingsUSD, true)}
            </span>
            <span className="text-xs text-emerald-700 font-medium">saved</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Optimal: <strong className="text-slate-900">{recommendedResult.strategyLabel}</strong>{' '}
            (${recommendedResult.logisticsCostPerWpUSD.toFixed(4)}/Wp)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">
            Effective Lead Time & Project Scale
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-2xl font-semibold text-slate-900">
              {bufferMetrics.effectiveMeanLeadTimeDays}d
            </span>
            <span className="text-xs text-slate-500">
              ±{bufferMetrics.combinedLeadTimeStdDev}d
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-600 font-mono tabular-nums">
            {input.params.farmCapacityMW} MWdc · {formatNumber(bufferMetrics.totalContainersRequired)} containers
          </div>
        </div>
      </div>

      {/* End-to-End Interactive Pipeline */}
      <SupplyChainPipeline
        stages={input.stages}
        attribution={stageAttribution}
        activeStrategy={activeStrategy}
        safetyStockModules={bufferMetrics.safetyStockModules}
        safetyStockDays={bufferMetrics.safetyStockDays}
        onUpdateStage={onUpdateStage}
      />

      {/* Horizontal Colorful Month-Wise Data & Previous Month Comparison */}
      <MonthlyComparisonChart
        strategies={strategies}
        activeStrategy={activeStrategy}
        onSelectStrategy={onSelectStrategy}
      />

      {/* Inventory Trajectory Simulation Chart */}
      <InventorySimulationChart
        strategies={strategies}
        activeStrategy={activeStrategy}
        onSelectStrategy={onSelectStrategy}
        safetyStockModules={bufferMetrics.safetyStockModules}
        siteLaydownCapModules={input.params.siteLaydownCapModules}
        installStartDay={input.params.installStartDay}
      />

      {/* Strategy Summary & Colorful Horizontal Stage Variance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">
              Supply Chain Stage Variance & Bottleneck Attribution
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Quantifies which node drives total lead-time variance (σ_L²) and safety-stock sizing.
            </p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 pr-4">Stage</th>
                  <th className="py-2.5 px-3 text-right">Eff. Lead</th>
                  <th className="py-2.5 px-3 text-right">Extra Delay</th>
                  <th className="py-2.5 px-3 w-36">Variance Share</th>
                  <th className="py-2.5 pl-3 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {stageAttribution.map((row) => (
                  <tr key={row.stageId} className="hover:bg-slate-50/80">
                    <td className="py-2.5 pr-4 font-medium text-slate-900">
                      {row.stageName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {row.avgLeadDays}d
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      +{row.expectedBottleneckDays}d
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="h-3 w-full bg-slate-100 rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-300"
                          style={{
                            width: `${Math.min(100, row.shareOfVariancePct)}%`,
                            backgroundColor: STAGE_BAR_COLORS[row.stageId],
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {row.shareOfVariancePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">
              Strategy Cost-Benefit Snapshot
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Expected outcomes across {input.params.monteCarloRuns} Monte Carlo runs.
            </p>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {(['direct', 'warehouse', 'hybrid'] as StrategyId[]).map((sid) => {
              const st = strategies[sid];
              const isRec = sid === recommendedStrategy;
              const isSelected = sid === activeStrategy;
              return (
                <button
                  key={sid}
                  type="button"
                  onClick={() => onSelectStrategy(sid)}
                  className={`w-full text-left py-3.5 px-3 -mx-3 rounded-md transition-colors flex items-center justify-between gap-4 cursor-pointer ${
                    isSelected ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                      <span>{st.strategyLabel}</span>
                      {isRec && (
                        <span className="text-[11px] font-medium text-emerald-700">
                          · Lowest Total Cost
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
                      {st.installationContinuityPct}% uptime · {st.avgStockoutDays}d stockout ·{' '}
                      {formatUSD(st.portDemurrageCostUSD, true)} demurrage
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {formatUSD(st.totalLogisticsCostUSD, true)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ${st.logisticsCostPerWpUSD.toFixed(4)}/Wp
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
