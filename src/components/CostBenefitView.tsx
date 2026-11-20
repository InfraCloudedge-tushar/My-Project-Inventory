import React from 'react';
import {
  CostAssumptions,
  SimulationOutput,
  SupplyChainModelInput,
} from '../types/supplyChain';
import { formatDecimal, formatNumber, formatUSD } from '../utils/formatters';
import { CostBenefitCharts } from './CostBenefitCharts';

interface CostBenefitViewProps {
  input: SupplyChainModelInput;
  output: SimulationOutput;
  onUpdateCosts: (patch: Partial<CostAssumptions>) => void;
}

export const CostBenefitView: React.FC<CostBenefitViewProps> = ({
  input,
  output,
  onUpdateCosts,
}) => {
  const { costs } = input;
  const { strategies, sensitivityCurve, breakEvenVolatilityMultiplier, recommendedStrategy, maxSavingsUSD } =
    output;

  const direct = strategies.direct;
  const warehouse = strategies.warehouse;
  const hybrid = strategies.hybrid;
  const rec = strategies[recommendedStrategy];

  const warehouseVsDirectDelta = direct.totalLogisticsCostUSD - warehouse.totalLogisticsCostUSD;
  const hybridVsDirectDelta = direct.totalLogisticsCostUSD - hybrid.totalLogisticsCostUSD;

  return (
    <div className="space-y-6">
      {/* Executive Decision Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <div className="text-xs text-slate-500">
              Cost-Benefit Recommendation · Warehouse vs. Direct-to-Site Delivery
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mt-1">
              {rec.strategyLabel} minimizes total logistics cost at{' '}
              <span className="font-mono tabular-nums text-amber-700">
                {formatUSD(rec.totalLogisticsCostUSD)}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-2xl">
              {warehouseVsDirectDelta > 0
                ? `Regional warehousing eliminates ${formatUSD(direct.portDemurrageCostUSD - warehouse.portDemurrageCostUSD)} in port demurrage and avoids ${formatUSD(direct.idleCrewPenaltyCostUSD - warehouse.idleCrewPenaltyCostUSD)} in idle crew standby costs, yielding net savings of ${formatUSD(warehouseVsDirectDelta)} over Direct-to-Site.`
                : `Under current low-variance transit assumptions, Direct-to-Site saves ${formatUSD(Math.abs(warehouseVsDirectDelta))} versus full regional warehousing because avoided warehouse lease and double-handling exceed stockout exposure.`}
              {hybridVsDirectDelta > warehouseVsDirectDelta &&
                ` The Hybrid Cross-Dock strategy captures ${formatUSD(hybridVsDirectDelta)} in net savings by buffering only Safety Stock while keeping steady-state containers direct.`}
            </p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-4 pt-4 lg:pt-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-100">
            <div>
              <div className="text-xs text-slate-500">Max Strategy Savings</div>
              <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-emerald-700">
                {formatUSD(maxSavingsUSD)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                vs. highest-cost alternative
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Break-Even Volatility</div>
              <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-slate-900">
                {breakEvenVolatilityMultiplier !== null
                  ? `${breakEvenVolatilityMultiplier}x`
                  : '> 2.0x'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                threshold where WH beats Direct
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stacked Cost & Break-Even Sensitivity Charts */}
      <CostBenefitCharts
        strategies={strategies}
        sensitivityCurve={sensitivityCurve}
        breakEvenVolatilityMultiplier={breakEvenVolatilityMultiplier}
      />

      {/* Full Cost-Benefit Matrix Table */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Side-by-Side Cost-Benefit Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Line-item comparison across identical Monte Carlo disruption realizations.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-700">
                <th className="py-3 pr-4">Cost / Performance Metric</th>
                <th className="py-3 px-4 text-right">Direct-to-Site (JIT)</th>
                <th className="py-3 px-4 text-right">Regional Buffer Warehouse</th>
                <th className="py-3 px-4 text-right">Optimized Hybrid Buffer</th>
                <th className="py-3 pl-4 text-right">WH vs. Direct Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr>
                <td className="py-2.5 pr-4 text-slate-700">Factory QC & Ocean Freight</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(direct.procurementAndOceanCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(warehouse.procurementAndOceanCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(hybrid.procurementAndOceanCostUSD)}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-slate-400">
                  $0
                </td>
              </tr>

              <tr>
                <td className="py-2.5 pr-4 text-slate-700">Inland Drayage & Linehaul Freight</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(direct.freightAndDrayageCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(warehouse.freightAndDrayageCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(hybrid.freightAndDrayageCostUSD)}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-red-700">
                  +{formatUSD(warehouse.freightAndDrayageCostUSD - direct.freightAndDrayageCostUSD)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 pr-4 text-slate-700">Regional Warehouse Fixed Lease</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400">
                  $0
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(warehouse.warehouseLeaseCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(hybrid.warehouseLeaseCostUSD)}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-red-700">
                  +{formatUSD(warehouse.warehouseLeaseCostUSD)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 pr-4 text-slate-700">Warehouse Cross-Dock & Double-Handling</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400">
                  $0
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(warehouse.warehouseHandlingCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(hybrid.warehouseHandlingCostUSD)}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-red-700">
                  +{formatUSD(warehouse.warehouseHandlingCostUSD)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 pr-4 text-slate-700">Buffer Inventory Working Capital Cost</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(direct.workingCapitalCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(warehouse.workingCapitalCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(hybrid.workingCapitalCostUSD)}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-red-700">
                  +{formatUSD(warehouse.workingCapitalCostUSD - direct.workingCapitalCostUSD)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 pr-4 text-slate-700">Port Demurrage & Truck Detention</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-700 font-medium">
                  {formatUSD(direct.portDemurrageCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(warehouse.portDemurrageCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(hybrid.portDemurrageCostUSD)}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                  -{formatUSD(direct.portDemurrageCostUSD - warehouse.portDemurrageCostUSD)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 pr-4 text-slate-700">Idle Installation Crew & Crane Standby</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700 font-medium">
                  {formatUSD(direct.idleCrewPenaltyCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(warehouse.idleCrewPenaltyCostUSD)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatUSD(hybrid.idleCrewPenaltyCostUSD)}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                  -{formatUSD(direct.idleCrewPenaltyCostUSD - warehouse.idleCrewPenaltyCostUSD)}
                </td>
              </tr>

              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td className="py-3 pr-4">Total Supply Chain Logistics Cost</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatUSD(direct.totalLogisticsCostUSD)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatUSD(warehouse.totalLogisticsCostUSD)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700">
                  {formatUSD(hybrid.totalLogisticsCostUSD)}
                </td>
                <td
                  className={`py-3 pl-4 text-right font-mono tabular-nums ${
                    warehouseVsDirectDelta >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {warehouseVsDirectDelta >= 0
                    ? `-${formatUSD(warehouseVsDirectDelta)} saved`
                    : `+${formatUSD(Math.abs(warehouseVsDirectDelta))}`}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 pr-4 text-slate-600">Logistics Cost per Watt-Peak ($/Wp)</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  ${direct.logisticsCostPerWpUSD.toFixed(4)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  ${warehouse.logisticsCostPerWpUSD.toFixed(4)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  ${hybrid.logisticsCostPerWpUSD.toFixed(4)}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-slate-500">
                  ${(warehouse.logisticsCostPerWpUSD - direct.logisticsCostPerWpUSD).toFixed(4)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 pr-4 text-slate-600">Installation Continuity / Avg Stockout Days</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatDecimal(direct.installationContinuityPct, 1)}% ({direct.avgStockoutDays}d)
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatDecimal(warehouse.installationContinuityPct, 1)}% ({warehouse.avgStockoutDays}d)
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatDecimal(hybrid.installationContinuityPct, 1)}% ({hybrid.avgStockoutDays}d)
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-emerald-700">
                  +{formatDecimal(warehouse.installationContinuityPct - direct.installationContinuityPct, 1)}%
                </td>
              </tr>

              <tr>
                <td className="py-2.5 pr-4 text-slate-600">Peak Buffer Inventory (Modules)</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400">
                  0
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatNumber(warehouse.peakWarehouseModules)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {formatNumber(hybrid.peakWarehouseModules)}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-slate-500">
                  —
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactive Unit Cost Sensitivity Inputs */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Interactive Cost Assumption Controls
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Adjust real-world freight, warehouse lease, demurrage, or crew standby rates to test financial break-even live.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Warehouse Monthly Lease ($/mo)
            </span>
            <input
              type="number"
              min={0}
              step={2000}
              value={costs.warehouseMonthlyFixedUSD}
              onChange={(e) =>
                onUpdateCosts({
                  warehouseMonthlyFixedUSD: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Double-Handling Rate ($/module)
            </span>
            <input
              type="number"
              min={0}
              step={0.05}
              value={costs.warehouseHandlingPerModuleUSD}
              onChange={(e) =>
                onUpdateCosts({
                  warehouseHandlingPerModuleUSD: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Idle Crew Standby Cost ($/day)
            </span>
            <input
              type="number"
              min={0}
              step={1000}
              value={costs.idleCrewCostPerDayUSD}
              onChange={(e) =>
                onUpdateCosts({
                  idleCrewCostPerDayUSD: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Port Demurrage Rate ($/container/day)
            </span>
            <input
              type="number"
              min={0}
              step={20}
              value={costs.portDemurragePerContainerDayUSD}
              onChange={(e) =>
                onUpdateCosts({
                  portDemurragePerContainerDayUSD: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Direct Freight ($/container)
            </span>
            <input
              type="number"
              min={0}
              step={50}
              value={costs.directFreightPerContainerUSD}
              onChange={(e) =>
                onUpdateCosts({
                  directFreightPerContainerUSD: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Warehouse Inland Freight ($/container)
            </span>
            <input
              type="number"
              min={0}
              step={50}
              value={costs.warehouseInlandFreightPerContainerUSD}
              onChange={(e) =>
                onUpdateCosts({
                  warehouseInlandFreightPerContainerUSD: Math.max(
                    0,
                    Number(e.target.value) || 0
                  ),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>
        </div>
      </section>
    </div>
  );
};
