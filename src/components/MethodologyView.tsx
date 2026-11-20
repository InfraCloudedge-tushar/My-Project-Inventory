import React from 'react';
import { Download, Printer } from 'lucide-react';
import { SimulationOutput, SupplyChainModelInput } from '../types/supplyChain';
import { exportModelToExcel } from '../utils/excelIO';

interface MethodologyViewProps {
  input: SupplyChainModelInput;
  output: SimulationOutput;
}

export const MethodologyView: React.FC<MethodologyViewProps> = ({ input, output }) => {
  return (
    <div className="space-y-6">
      {/* Mathematical & Operations Research Formulation */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Operations Research & Simulation Equations
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Auditable formulas powering the buffer-stock optimizer, month-over-month tracking, and discrete-day Monte Carlo engine.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF Brief</span>
            </button>
            <button
              type="button"
              onClick={() => exportModelToExcel(input, output)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel Workbook</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-slate-700 leading-relaxed">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <h3 className="font-semibold text-slate-900">
              1. Combined Lead-Time Mean & Variance Decomposition
            </h3>
            <p className="mt-1.5 text-slate-600">
              Each supply chain stage <em>i</em> contributes both continuous transit dispersion (σᵢ)
              and discrete Bernoulli bottleneck disruption risk (probability pᵢ with delay dᵢ):
            </p>
            <div className="mt-3 p-3 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-900 space-y-1">
              <div>L_eff = Σ [ μᵢ + pᵢ · dᵢ ]</div>
              <div>σ_L²  = Σ [ σᵢ² + pᵢ · (1 - pᵢ) · dᵢ² ]</div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <h3 className="font-semibold text-slate-900">
              2. Stochastic Safety Stock (SS) & Reorder Point (ROP)
            </h3>
            <p className="mt-1.5 text-slate-600">
              Safety stock accounts simultaneously for installation weather/crew variance (σ_D) and
              end-to-end supply lead-time variance (σ_L) at target Cycle Service Level z:
            </p>
            <div className="mt-3 p-3 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-900 space-y-1">
              <div>SS  = z(CSL) · √( L_eff · σ_D² + D̄² · σ_L² )</div>
              <div>ROP = D̄ · L_eff + SS</div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <h3 className="font-semibold text-slate-900">
              3. Direct-to-Site Port Demurrage & Laydown Constraint
            </h3>
            <p className="mt-1.5 text-slate-600">
              In Direct-to-Site (JIT), solar farms have finite physical laydown yard capacity. When
              arriving containers exceed site capacity, containers are held at the port terminal or
              gate queue, triggering daily demurrage once port dwell exceeds free days:
            </p>
            <div className="mt-3 p-3 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-900 space-y-1">
              <div>Demurrage = Σ max(0, DwellDays - FreeDays) · Rate_demurrage</div>
              <div>IdlePenalty = StockoutDays · IdleCrewDailyCost</div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <h3 className="font-semibold text-slate-900">
              4. Common Random Numbers (CRN) & Monthly Aggregation
            </h3>
            <p className="mt-1.5 text-slate-600">
              All three strategies (Direct-to-Site, Regional Warehouse, Hybrid Cross-Dock) are
              evaluated over the exact same {input.params.monteCarloRuns} stochastic stage-duration
              and daily-weather draws, then rolled up into 30-day project months for Month-over-Month
              (MoM) tracking:
            </p>
            <div className="mt-3 p-3 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-900 space-y-1">
              <div>NetSavings = Cost(Direct) - Cost(BufferStrategy)</div>
              <div>MoM Δ (%)  = (Metric_M - Metric_M-1) / Metric_M-1 × 100</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
