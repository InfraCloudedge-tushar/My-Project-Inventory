import React from 'react';
import {
  ProjectParameters,
  SimulationOutput,
  StrategyId,
  SupplyChainModelInput,
} from '../types/supplyChain';
import { formatDayToShortDate, formatDecimal, formatNumber } from '../utils/formatters';
import { InventorySimulationChart } from './InventorySimulationChart';

interface BufferAndMonteCarloViewProps {
  input: SupplyChainModelInput;
  output: SimulationOutput;
  activeStrategy: StrategyId;
  onSelectStrategy: (id: StrategyId) => void;
  onUpdateParams: (patch: Partial<ProjectParameters>) => void;
}

export const BufferAndMonteCarloView: React.FC<BufferAndMonteCarloViewProps> = ({
  input,
  output,
  activeStrategy,
  onSelectStrategy,
  onUpdateParams,
}) => {
  const { params } = input;
  const { bufferMetrics, sampleBottlenecks, stageAttribution } = output;

  return (
    <div className="space-y-6">
      {/* Top Split: Interactive Buffer Controls + Computed Inventory Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Buffer-Stock & Stochastic Demand Parameters
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tune target service level, daily crew burn rate, site laydown cap, and Monte Carlo trial count.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">
                  Target Cycle Service Level (CSL)
                </span>
                <span className="font-mono tabular-nums font-semibold text-amber-700">
                  {params.targetServiceLevelPct}% (z = {bufferMetrics.zScore})
                </span>
              </div>
              <input
                type="range"
                min={85}
                max={99.5}
                step={0.5}
                value={params.targetServiceLevelPct}
                onChange={(e) =>
                  onUpdateParams({ targetServiceLevelPct: Number(e.target.value) })
                }
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-0.5">
                <span>85.0%</span>
                <span>95.0%</span>
                <span>99.5%</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">
                  Daily Installation Burn Rate
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatNumber(params.dailyInstallRate)} mod/day
                </span>
              </div>
              <input
                type="range"
                min={800}
                max={4500}
                step={100}
                value={params.dailyInstallRate}
                onChange={(e) =>
                  onUpdateParams({ dailyInstallRate: Number(e.target.value) })
                }
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-0.5">
                <span>800</span>
                <span>2,200</span>
                <span>4,500</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">
                  Daily Install Variability (σ_D)
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  ±{formatNumber(params.installRateStdDev)} mod/day
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={600}
                step={20}
                value={params.installRateStdDev}
                onChange={(e) =>
                  onUpdateParams({ installRateStdDev: Number(e.target.value) })
                }
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-0.5">
                <span>0</span>
                <span>300</span>
                <span>600</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">
                  Site Laydown Yard Cap (Direct)
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatNumber(params.siteLaydownCapModules)} mod
                </span>
              </div>
              <input
                type="range"
                min={4000}
                max={40000}
                step={1000}
                value={params.siteLaydownCapModules}
                onChange={(e) =>
                  onUpdateParams({ siteLaydownCapModules: Number(e.target.value) })
                }
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-0.5">
                <span>4k</span>
                <span>20k</span>
                <span>40k</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">
                  Installation Start Date
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatDayToShortDate(params.projectStartDate, params.installStartDay)}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={2}
                value={params.installStartDay}
                onChange={(e) =>
                  onUpdateParams({ installStartDay: Number(e.target.value) })
                }
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">
                  Monte Carlo Iterations
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {params.monteCarloRuns} trials
                </span>
              </div>
              <input
                type="range"
                min={40}
                max={400}
                step={20}
                value={params.monteCarloRuns}
                onChange={(e) =>
                  onUpdateParams({ monteCarloRuns: Number(e.target.value) })
                }
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* Computed Inventory Policy Card */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                Calculated Buffer-Stock Policy
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Derived via combined demand and lead-time uncertainty (King’s stochastic formula).
              </p>
            </div>

            <dl className="mt-4 divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Optimal Safety Stock (SS)</dt>
                <dd className="font-mono tabular-nums font-semibold text-amber-700 text-sm">
                  {formatNumber(bufferMetrics.safetyStockModules)} modules
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Buffer Coverage (Days of Supply)</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {bufferMetrics.safetyStockDays} days
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Reorder Point (ROP)</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatNumber(bufferMetrics.reorderPointModules)} modules
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Recommended Warehouse Footprint</dt>
                <dd className="font-mono tabular-nums text-slate-900">
                  {formatNumber(bufferMetrics.recommendedWarehouseModules)} mod (
                  {bufferMetrics.recommendedWarehouseContainers} cont.)
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Nominal vs. Effective Lead Time</dt>
                <dd className="font-mono tabular-nums text-slate-900">
                  {bufferMetrics.nominalLeadTimeDays}d nominal →{' '}
                  {bufferMetrics.effectiveMeanLeadTimeDays}d eff.
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Combined Lead-Time Std Dev (σ_L)</dt>
                <dd className="font-mono tabular-nums text-slate-900">
                  ±{formatDecimal(bufferMetrics.combinedLeadTimeStdDev, 2)} days
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      {/* Simulation Chart */}
      <InventorySimulationChart
        strategies={output.strategies}
        activeStrategy={activeStrategy}
        onSelectStrategy={onSelectStrategy}
        safetyStockModules={bufferMetrics.safetyStockModules}
        siteLaydownCapModules={params.siteLaydownCapModules}
        installStartDay={params.installStartDay}
      />

      {/* Bottom Split: Bottleneck Log + Stage Variance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">
              Sampled Monte Carlo Bottleneck Disruptions
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Actual stochastic hold/delay events drawn across early simulation trials.
            </p>
          </div>
          {sampleBottlenecks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No bottleneck disruptions triggered under current 0% risk stage parameters.
            </div>
          ) : (
            <div className="mt-4 max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                    <th className="py-2 pr-3">Trial</th>
                    <th className="py-2 px-3">Batch</th>
                    <th className="py-2 px-3">Disrupted Stage</th>
                    <th className="py-2 px-3 text-right">Delay</th>
                    <th className="py-2 pl-3 text-right">Modules Impacted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sampleBottlenecks.slice(0, 16).map((ev, idx) => (
                    <tr key={`${ev.runId}-${ev.batchId}-${ev.stageId}-${idx}`}>
                      <td className="py-2 pr-3 font-mono tabular-nums text-slate-500">
                        #{ev.runId}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums font-medium text-slate-900">
                        {ev.batchId}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{ev.stageName}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-red-700 font-medium">
                        +{ev.extraDelayDays}d
                      </td>
                      <td className="py-2 pl-3 text-right font-mono tabular-nums text-slate-700">
                        {formatNumber(ev.impactedModules)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">
              Stage-by-Stage Variance Share
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Targeting the highest-share stage reduces required Safety Stock fastest.
            </p>
          </div>
          <div className="mt-4 space-y-3.5">
            {stageAttribution.map((s) => {
              const stageColors: Record<string, string> = {
                procurement: '#4F46E5',
                ocean: '#0284C7',
                port: '#D97706',
                drayage: '#059669',
                staging: '#0D9488',
              };
              return (
                <div key={s.stageId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-800">{s.stageName}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {s.shareOfVariancePct}%
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{
                        width: `${Math.min(100, s.shareOfVariancePct)}%`,
                        backgroundColor: stageColors[s.stageId] ?? '#475569',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
