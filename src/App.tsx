import React, { useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Download,
  FileSpreadsheet,
  GitBranch,
  Layers,
  Menu,
  RefreshCw,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { SCENARIO_PRESETS, generateShipmentsFromParams } from './data/presets';
import { runSupplyChainSimulation } from './engine/simulation';
import {
  CostAssumptions,
  ProjectParameters,
  ShipmentBatch,
  StageKey,
  StrategyId,
  SupplyChainModelInput,
  SupplyChainStage,
} from './types/supplyChain';
import { exportModelToExcel, importModelFromExcelFile } from './utils/excelIO';
import { OverviewView } from './components/OverviewView';
import { BufferAndMonteCarloView } from './components/BufferAndMonteCarloView';
import { CostBenefitView } from './components/CostBenefitView';
import { ExcelDataManagerView } from './components/ExcelDataManagerView';
import { MethodologyView } from './components/MethodologyView';

type TabId = 'overview' | 'buffer' | 'cost-benefit' | 'excel' | 'methodology';

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Supply Chain Overview', icon: GitBranch },
  { id: 'buffer', label: 'Buffer & Monte Carlo', icon: Layers },
  { id: 'cost-benefit', label: 'Warehouse vs. Direct', icon: BarChart3 },
  { id: 'excel', label: 'Excel Data & Scenarios', icon: FileSpreadsheet },
  { id: 'methodology', label: 'Model Guide', icon: BookOpen },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [activePresetId, setActivePresetId] = useState<string>(SCENARIO_PRESETS[0].id);
  const [modelInput, setModelInput] = useState<SupplyChainModelInput>(() =>
    structuredClone(SCENARIO_PRESETS[0].input)
  );
  const [activeStrategy, setActiveStrategy] = useState<StrategyId>('warehouse');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const headerFileInputRef = useRef<HTMLInputElement | null>(null);

  const simulationOutput = useMemo(
    () => runSupplyChainSimulation(modelInput),
    [modelInput]
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleSelectPreset = (presetId: string) => {
    const found = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(presetId);
    setModelInput(structuredClone(found.input));
    showToast(`Loaded scenario: ${found.name}`);
  };

  const handleUpdateParams = (patch: Partial<ProjectParameters>) => {
    setModelInput((prev) => ({
      ...prev,
      params: { ...prev.params, ...patch },
    }));
  };

  const handleUpdateStage = (
    stageId: StageKey,
    patch: Partial<SupplyChainStage>
  ) => {
    setModelInput((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.id === stageId ? { ...s, ...patch } : s)),
    }));
  };

  const handleUpdateCosts = (patch: Partial<CostAssumptions>) => {
    setModelInput((prev) => ({
      ...prev,
      costs: { ...prev.costs, ...patch },
    }));
  };

  const handleUpdateShipments = (shipments: ShipmentBatch[]) => {
    setModelInput((prev) => ({
      ...prev,
      shipments,
    }));
  };

  const handleAutoGenerateShipments = () => {
    setModelInput((prev) => ({
      ...prev,
      shipments: generateShipmentsFromParams(prev.params),
    }));
    showToast('Regenerated shipment waves to match farm capacity');
  };

  const handleRerunMonteCarlo = () => {
    setModelInput((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        randomSeed: ((prev.params.randomSeed + 137) % 99000) + 100,
      },
    }));
    showToast('Re-sampled stochastic Monte Carlo trials');
  };

  const handleQuickExcelImport = async (file: File) => {
    try {
      const res = await importModelFromExcelFile(file, modelInput);
      setModelInput(res.input);
      showToast(`Imported ${file.name} (${res.updatedSections.join(', ')})`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to parse Excel file'
      );
    }
  };

  const activeNavLabel =
    NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900 text-slate-100 border-r border-slate-800">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-slate-800 shrink-0">
          <Sun className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
            My Project
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-amber-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Scenario Switcher inside Sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div>
            <label
              htmlFor="sidebar-preset"
              className="block text-[11px] font-medium text-slate-400 mb-1.5"
            >
              Active Scenario Preset
            </label>
            <select
              id="sidebar-preset"
              value={activePresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-slate-800 border border-slate-700 text-slate-100 rounded-md focus:outline-none focus:border-amber-500"
            >
              {SCENARIO_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-400 font-mono tabular-nums space-y-1 pt-1">
            <div className="flex justify-between">
              <span>Capacity</span>
              <span className="text-slate-200">{modelInput.params.farmCapacityMW} MWdc</span>
            </div>
            <div className="flex justify-between">
              <span>Modules</span>
              <span className="text-slate-200">
                {simulationOutput.bufferMetrics.totalModulesRequired.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Safety Stock</span>
              <span className="text-amber-400">
                {simulationOutput.bufferMetrics.safetyStockModules.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-full bg-slate-900 text-slate-100 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-400" />
                <span className="font-display text-base font-bold text-white">
                  My Project
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md ${
                      active
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, primary actions on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
              <span className="text-slate-400 hidden sm:inline truncate max-w-[240px]">
                {modelInput.params.projectName}
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 truncate">
                {activeNavLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <input
              ref={headerFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleQuickExcelImport(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={handleRerunMonteCarlo}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Trials</span>
            </button>
            <button
              type="button"
              onClick={() => headerFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportModelToExcel(modelInput, simulationOutput);
                showToast('Exported multi-sheet Excel workbook (.xlsx)');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </header>

        {/* Subtle Non-Intrusive Feedback Banner */}
        {toastMsg && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-2 text-xs text-amber-900 flex items-center justify-between">
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-amber-700 hover:text-amber-900 font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Viewport Workspace */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              input={modelInput}
              output={simulationOutput}
              activeStrategy={activeStrategy}
              onSelectStrategy={setActiveStrategy}
              onUpdateStage={handleUpdateStage}
            />
          )}

          {activeTab === 'buffer' && (
            <BufferAndMonteCarloView
              input={modelInput}
              output={simulationOutput}
              activeStrategy={activeStrategy}
              onSelectStrategy={setActiveStrategy}
              onUpdateParams={handleUpdateParams}
            />
          )}

          {activeTab === 'cost-benefit' && (
            <CostBenefitView
              input={modelInput}
              output={simulationOutput}
              onUpdateCosts={handleUpdateCosts}
            />
          )}

          {activeTab === 'excel' && (
            <ExcelDataManagerView
              input={modelInput}
              output={simulationOutput}
              presets={SCENARIO_PRESETS}
              activePresetId={activePresetId}
              onSelectPreset={handleSelectPreset}
              onReplaceInput={setModelInput}
              onUpdateParams={handleUpdateParams}
              onUpdateStage={handleUpdateStage}
              onUpdateShipments={handleUpdateShipments}
              onAutoGenerateShipments={handleAutoGenerateShipments}
            />
          )}

          {activeTab === 'methodology' && (
            <MethodologyView input={modelInput} output={simulationOutput} />
          )}
        </main>
      </div>
    </div>
  );
}
