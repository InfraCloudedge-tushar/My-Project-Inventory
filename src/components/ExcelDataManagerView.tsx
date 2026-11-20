import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import {
  ProjectParameters,
  ScenarioPreset,
  ShipmentBatch,
  SimulationOutput,
  StageKey,
  SupplyChainModelInput,
  SupplyChainStage,
} from '../types/supplyChain';
import { exportModelToExcel, importModelFromExcelFile } from '../utils/excelIO';
import { formatDayToShortDate, formatNumber } from '../utils/formatters';

interface ExcelDataManagerViewProps {
  input: SupplyChainModelInput;
  output: SimulationOutput;
  presets: ScenarioPreset[];
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  onReplaceInput: (nextInput: SupplyChainModelInput) => void;
  onUpdateParams: (patch: Partial<ProjectParameters>) => void;
  onUpdateStage: (stageId: StageKey, patch: Partial<SupplyChainStage>) => void;
  onUpdateShipments: (shipments: ShipmentBatch[]) => void;
  onAutoGenerateShipments: () => void;
}

export const ExcelDataManagerView: React.FC<ExcelDataManagerViewProps> = ({
  input,
  output,
  presets,
  activePresetId,
  onSelectPreset,
  onReplaceInput,
  onUpdateParams,
  onUpdateStage,
  onUpdateShipments,
  onAutoGenerateShipments,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    details: string[];
  } | null>(null);

  const handleFile = async (file: File) => {
    try {
      const result = await importModelFromExcelFile(file, input);
      onReplaceInput(result.input);
      setImportStatus({
        type: 'success',
        title: `Loaded "${file.name}" successfully`,
        details: [
          `Updated: ${result.updatedSections.join(', ')}`,
          ...result.warnings,
        ],
      });
    } catch (err) {
      setImportStatus({
        type: 'error',
        title: `Could not import "${file.name}"`,
        details: [err instanceof Error ? err.message : 'Invalid Excel workbook format'],
      });
    }
  };

  const handleBatchUpdate = (idx: number, patch: Partial<ShipmentBatch>) => {
    const next = input.shipments.map((b, i) => {
      if (i !== idx) return b;
      const updated = { ...b, ...patch };
      if (patch.containers !== undefined) {
        updated.modules = updated.containers * input.params.modulesPerContainer;
      }
      return updated;
    });
    onUpdateShipments(next);
  };

  const handleAddBatch = () => {
    const last = input.shipments[input.shipments.length - 1];
    const nextDay = last ? last.releaseDay + 6 : 1;
    const containers = 24;
    onUpdateShipments([
      ...input.shipments,
      {
        batchId: `WV-${String(input.shipments.length + 1).padStart(2, '0')}`,
        releaseDay: nextDay,
        containers,
        modules: containers * input.params.modulesPerContainer,
        priorityMode: 'standard',
      },
    ]);
  };

  const handleDeleteBatch = (idx: number) => {
    if (input.shipments.length <= 1) return;
    onUpdateShipments(input.shipments.filter((_, i) => i !== idx));
  };

  const totalScheduledContainers = input.shipments.reduce((a, b) => a + b.containers, 0);
  const totalScheduledModules = input.shipments.reduce((a, b) => a + b.modules, 0);

  return (
    <div className="space-y-6">
      {/* Excel Round-Trip Import / Export Panel */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Offline Excel (.xlsx) Workbook Sync
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Download the complete multi-sheet Excel model, edit project scale, stage lead times, cost rates, or shipment waves in Microsoft Excel on Windows, and drop the saved file back here to update the simulation offline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportModelToExcel(input, output)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel Workbook (.xlsx)</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Drag and Drop Upload */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFile(f);
            }}
            className={`lg:col-span-7 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors ${
              isDragging
                ? 'border-amber-600 bg-amber-50/40'
                : 'border-slate-300 bg-slate-50/70 hover:border-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-7 h-7 text-slate-600 mb-2.5" />
            <div className="text-sm font-medium text-slate-900">
              Drop modified .xlsx or .csv file here
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Reads <code className="font-mono text-slate-700">Project_Parameters</code>,{' '}
              <code className="font-mono text-slate-700">Supply_Chain_Stages</code>,{' '}
              <code className="font-mono text-slate-700">Cost_Assumptions</code>, and{' '}
              <code className="font-mono text-slate-700">Shipment_Schedule</code> sheets locally in browser memory.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Browse Excel File</span>
            </button>
          </div>

          {/* Scenario Presets */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50/80 border border-slate-200 rounded-lg p-5">
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Quick Scenario Presets
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Load pre-calibrated solar logistics cases for live comparison.
              </p>
              <div className="mt-3 space-y-2">
                {presets.map((p) => {
                  const active = p.id === activePresetId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectPreset(p.id);
                        setImportStatus(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md border text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-white border-amber-600 text-slate-900'
                          : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {p.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {importStatus && (
          <div
            className={`mt-4 p-3.5 rounded-md border text-xs flex items-start gap-2.5 ${
              importStatus.type === 'success'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-red-50/70 border-red-200 text-red-900'
            }`}
          >
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">{importStatus.title}</div>
              <ul className="mt-1 space-y-0.5 text-[11px]">
                {importStatus.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Core Project Scale Inputs */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Solar Farm Scale & Equipment Specifications
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Project Name
            </span>
            <input
              type="text"
              value={input.params.projectName}
              onChange={(e) => onUpdateParams({ projectName: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Project Start Date
            </span>
            <input
              type="date"
              value={input.params.projectStartDate}
              onChange={(e) =>
                onUpdateParams({ projectStartDate: e.target.value || '2026-07-01' })
              }
              className="w-full px-3 py-1.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Farm Capacity (MWdc)
            </span>
            <input
              type="number"
              min={10}
              step={5}
              value={input.params.farmCapacityMW}
              onChange={(e) =>
                onUpdateParams({
                  farmCapacityMW: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Module Wattage (Wp)
            </span>
            <input
              type="number"
              min={300}
              step={10}
              value={input.params.moduleWattageWp}
              onChange={(e) =>
                onUpdateParams({
                  moduleWattageWp: Math.max(100, Number(e.target.value) || 100),
                })
              }
              className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-700 mb-1">
              Modules / 40ft Container
            </span>
            <input
              type="number"
              min={200}
              step={20}
              value={input.params.modulesPerContainer}
              onChange={(e) =>
                onUpdateParams({
                  modulesPerContainer: Math.max(100, Number(e.target.value) || 100),
                })
              }
              className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-amber-600"
            />
          </label>
        </div>
      </section>

      {/* Editable Stage Parameters Table */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Supply Chain Stages (Inline Spreadsheet Editor)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Edits update the stochastic simulation and Excel export immediately.
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                <th className="py-2 pr-3">Stage</th>
                <th className="py-2 px-2 text-right">Mean (d)</th>
                <th className="py-2 px-2 text-right">Std Dev (d)</th>
                <th className="py-2 px-2 text-right">Bottleneck (%)</th>
                <th className="py-2 px-2 text-right">Delay (d)</th>
                <th className="py-2 pl-2 text-right">Unit Cost ($/mod)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {input.stages.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-3 font-medium text-slate-900">
                    <div>{s.name}</div>
                    <div className="text-[11px] text-slate-400">{s.location}</div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={s.meanDays}
                      onChange={(e) =>
                        onUpdateStage(s.id, {
                          meanDays: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-16 px-2 py-1 text-right font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.2}
                      value={s.stdDevDays}
                      onChange={(e) =>
                        onUpdateStage(s.id, {
                          stdDevDays: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-16 px-2 py-1 text-right font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={s.bottleneckProbPct}
                      onChange={(e) =>
                        onUpdateStage(s.id, {
                          bottleneckProbPct: Math.min(
                            100,
                            Math.max(0, Number(e.target.value) || 0)
                          ),
                        })
                      }
                      className="w-16 px-2 py-1 text-right font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={s.bottleneckDelayDays}
                      onChange={(e) =>
                        onUpdateStage(s.id, {
                          bottleneckDelayDays: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-16 px-2 py-1 text-right font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={s.unitCostPerModule}
                      onChange={(e) =>
                        onUpdateStage(s.id, {
                          unitCostPerModule: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-20 px-2 py-1 text-right font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Editable Shipment Waves Table */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Procurement & Shipment Release Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
              Scheduled: {formatNumber(totalScheduledContainers)} containers (
              {formatNumber(totalScheduledModules)} modules) · Target:{' '}
              {formatNumber(output.bufferMetrics.totalContainersRequired)} containers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAutoGenerateShipments}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Auto-Fit Waves to Farm MW</span>
            </button>
            <button
              type="button"
              onClick={handleAddBatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Batch</span>
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                <th className="py-2 pr-3">Batch ID</th>
                <th className="py-2 px-3 text-right">Release Day</th>
                <th className="py-2 px-3">Release Date</th>
                <th className="py-2 px-3 text-right">40ft Containers</th>
                <th className="py-2 px-3 text-right">Modules</th>
                <th className="py-2 px-3">Mode</th>
                <th className="py-2 pl-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {input.shipments.map((batch, idx) => (
                <tr key={`${batch.batchId}-${idx}`} className="hover:bg-slate-50/70">
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={batch.batchId}
                      onChange={(e) =>
                        handleBatchUpdate(idx, { batchId: e.target.value })
                      }
                      className="w-24 px-2 py-1 font-mono bg-slate-50 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min={1}
                      value={batch.releaseDay}
                      onChange={(e) =>
                        handleBatchUpdate(idx, {
                          releaseDay: Math.max(1, Math.round(Number(e.target.value) || 1)),
                        })
                      }
                      className="w-20 px-2 py-1 text-right font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {formatDayToShortDate(input.params.projectStartDate, batch.releaseDay)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min={1}
                      value={batch.containers}
                      onChange={(e) =>
                        handleBatchUpdate(idx, {
                          containers: Math.max(1, Math.round(Number(e.target.value) || 1)),
                        })
                      }
                      className="w-20 px-2 py-1 text-right font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatNumber(batch.modules)}
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={batch.priorityMode}
                      onChange={(e) =>
                        handleBatchUpdate(idx, {
                          priorityMode: e.target.value as ShipmentBatch['priorityMode'],
                        })
                      }
                      className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded"
                    >
                      <option value="buffer">buffer</option>
                      <option value="standard">standard</option>
                      <option value="expedited">expedited</option>
                    </select>
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteBatch(idx)}
                      disabled={input.shipments.length <= 1}
                      className="p-1 text-slate-400 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                      aria-label={`Remove ${batch.batchId}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
