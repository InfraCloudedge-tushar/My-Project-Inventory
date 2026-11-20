import React, { useState } from 'react';
import {
  Anchor,
  ArrowRight,
  Factory,
  HardHat,
  PackageCheck,
  Ship,
  Truck,
  Warehouse,
} from 'lucide-react';
import {
  StageAttribution,
  StageKey,
  StrategyId,
  SupplyChainStage,
} from '../types/supplyChain';
import { formatDecimal } from '../utils/formatters';

interface SupplyChainPipelineProps {
  stages: SupplyChainStage[];
  attribution: StageAttribution[];
  activeStrategy: StrategyId;
  safetyStockModules: number;
  safetyStockDays: number;
  onUpdateStage: (stageId: StageKey, patch: Partial<SupplyChainStage>) => void;
}

const STAGE_ICONS: Record<StageKey, React.FC<{ className?: string }>> = {
  procurement: Factory,
  ocean: Ship,
  port: Anchor,
  drayage: Truck,
  staging: PackageCheck,
};

export const SupplyChainPipeline: React.FC<SupplyChainPipelineProps> = ({
  stages,
  attribution,
  activeStrategy,
  safetyStockModules,
  safetyStockDays,
  onUpdateStage,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<StageKey>('port');

  const selectedStage = stages.find((s) => s.id === selectedStageId) ?? stages[0];
  const selectedAttr = attribution.find((a) => a.stageId === selectedStage.id);

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            End-to-End Solar Module Supply Chain Topology
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Click any stage node to inspect variance contribution and adjust lead-time or bottleneck risk parameters.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums font-mono">
          <span>
            Strategy:{' '}
            <strong className="text-slate-900 font-semibold">
              {activeStrategy === 'warehouse'
                ? 'Regional Buffer Hub'
                : activeStrategy === 'direct'
                  ? 'Direct-to-Site JIT'
                  : 'Hybrid Cross-Dock'}
            </strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span>
            Buffer Target:{' '}
            <strong className="text-amber-700 font-semibold">
              {safetyStockModules.toLocaleString()} mod ({safetyStockDays}d)
            </strong>
          </span>
        </div>
      </div>

      {/* Horizontal Pipeline Nodes */}
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-[880px] grid grid-cols-6 gap-3 items-stretch">
          {stages.map((stage) => {
            const Icon = STAGE_ICONS[stage.id];
            const attr = attribution.find((a) => a.stageId === stage.id);
            const isSelected = stage.id === selectedStageId;
            const highRisk = stage.bottleneckProbPct >= 18;
            const bypassed = stage.meanDays === 0 && stage.stdDevDays === 0;

            return (
              <div key={stage.id} className="relative flex items-stretch">
                <button
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/40'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-amber-700' : 'text-slate-600'
                      }`}
                    />
                    <span
                      className={`text-[11px] font-mono tabular-nums font-medium ${
                        bypassed
                          ? 'text-slate-400'
                          : highRisk
                            ? 'text-red-700'
                            : 'text-slate-500'
                      }`}
                    >
                      {bypassed
                        ? 'Bypassed'
                        : `${stage.bottleneckProbPct}% risk`}
                    </span>
                  </div>

                  <div className="mt-2.5 text-xs font-semibold text-slate-900 leading-snug line-clamp-2 min-h-[2rem]">
                    {stage.name}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-baseline justify-between font-mono tabular-nums">
                    <span className="text-sm font-semibold text-slate-900">
                      {stage.meanDays}d
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ±{formatDecimal(stage.stdDevDays, 1)}d
                    </span>
                  </div>

                  <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    Var share: {attr?.shareOfVariancePct ?? 0}%
                  </div>
                </button>
                <div className="hidden lg:flex items-center justify-center pl-1 text-slate-300 pointer-events-none">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}

          {/* Terminal Node: Buffer / Solar Array Installation */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-900 text-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              {activeStrategy === 'direct' ? (
                <HardHat className="w-4 h-4 text-amber-400" />
              ) : (
                <Warehouse className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-[11px] font-mono text-slate-300">
                Terminal
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs font-semibold text-white">
                {activeStrategy === 'direct'
                  ? 'Direct Array Install'
                  : activeStrategy === 'warehouse'
                    ? 'Buffer Hub -> Array'
                    : 'Cross-Dock -> Array'}
              </div>
              <div className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                {activeStrategy === 'direct'
                  ? 'Subject to laydown cap & port demurrage'
                  : 'Decoupled supply protects crew uptime'}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-amber-300 tabular-nums">
              Effective L: {attribution.reduce((a, b) => a + b.avgLeadDays, 0).toFixed(1)}d
            </div>
          </div>
        </div>
      </div>

      {/* Selected Stage Inline Inspector & Parameter Adjustment */}
      <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Selected Stage</span>
            <span aria-hidden="true">·</span>
            <span>{selectedStage.location}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mt-1">
            {selectedStage.name}
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {selectedStage.notes}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-600">
            <span>
              Expected Delay:{' '}
              <strong className="text-slate-900">
                +{selectedAttr?.expectedBottleneckDays ?? 0}d
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              Variance Contribution:{' '}
              <strong className="text-amber-700">
                {selectedAttr?.shareOfVariancePct ?? 0}%
              </strong>
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <label className="block">
            <span className="block text-[11px] font-medium text-slate-600 mb-1">
              Mean Lead (Days)
            </span>
            <input
              type="number"
              min={0}
              max={60}
              step={1}
              value={selectedStage.meanDays}
              onChange={(e) =>
                onUpdateStage(selectedStage.id, {
                  meanDays: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-medium text-slate-600 mb-1">
              Std Dev ± (Days)
            </span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.2}
              value={selectedStage.stdDevDays}
              onChange={(e) =>
                onUpdateStage(selectedStage.id, {
                  stdDevDays: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-medium text-slate-600 mb-1">
              Bottleneck Prob (%)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={selectedStage.bottleneckProbPct}
              onChange={(e) =>
                onUpdateStage(selectedStage.id, {
                  bottleneckProbPct: Math.min(
                    100,
                    Math.max(0, Number(e.target.value) || 0)
                  ),
                })
              }
              className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-medium text-slate-600 mb-1">
              Delay Impact (Days)
            </span>
            <input
              type="number"
              min={0}
              max={30}
              step={1}
              value={selectedStage.bottleneckDelayDays}
              onChange={(e) =>
                onUpdateStage(selectedStage.id, {
                  bottleneckDelayDays: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>
        </div>
      </div>
    </section>
  );
};
