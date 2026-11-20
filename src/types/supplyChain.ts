export type StrategyId = 'direct' | 'warehouse' | 'hybrid';

export type StageKey =
  | 'procurement'
  | 'ocean'
  | 'port'
  | 'drayage'
  | 'staging';

export interface SupplyChainStage {
  id: StageKey;
  name: string;
  location: string;
  meanDays: number;
  stdDevDays: number;
  bottleneckProbPct: number; // 0 - 100
  bottleneckDelayDays: number;
  unitCostPerModule: number; // USD per solar module
  notes: string;
}

export interface ProjectParameters {
  projectName: string;
  projectStartDate: string; // ISO YYYY-MM-DD (e.g. 2026-07-01)
  farmCapacityMW: number;
  moduleWattageWp: number;
  modulesPerContainer: number;
  moduleUnitPriceUSD: number;
  dailyInstallRate: number; // target modules installed per working day
  installRateStdDev: number; // daily weather/crew variability
  targetServiceLevelPct: number; // e.g., 95, 97.5, 99
  siteLaydownCapModules: number; // max modules that can sit directly at the solar farm site
  installStartDay: number; // day when site mechanical installation begins
  simulationHorizonDays: number;
  monteCarloRuns: number;
  randomSeed: number;
}

export interface CostAssumptions {
  warehouseMonthlyFixedUSD: number; // regional lease + security + insurance
  warehouseHandlingPerModuleUSD: number; // double-handling cross-dock/putaway/pick
  warehouseHoldingAnnualPct: number; // working capital / WACC %
  portFreeDays: number; // days before demurrage/detention kicks in
  portDemurragePerContainerDayUSD: number; // $/container/day after free days
  directTruckDetentionPerDayUSD: number; // $/container/day for direct delivery waiting at site
  idleCrewCostPerDayUSD: number; // full installation crew + telehandler/crane standby cost when stocked out
  directFreightPerContainerUSD: number; // port -> site direct linehaul
  warehouseInlandFreightPerContainerUSD: number; // port -> warehouse + warehouse -> site milk-run
}

export interface ShipmentBatch {
  batchId: string;
  releaseDay: number; // factory order release day
  containers: number;
  modules: number;
  priorityMode: 'standard' | 'expedited' | 'buffer';
}

export interface SupplyChainModelInput {
  params: ProjectParameters;
  stages: SupplyChainStage[];
  costs: CostAssumptions;
  shipments: ShipmentBatch[];
}

export interface BufferStockMetrics {
  totalModulesRequired: number;
  totalContainersRequired: number;
  nominalLeadTimeDays: number;
  effectiveMeanLeadTimeDays: number; // includes expected bottleneck impact
  combinedLeadTimeStdDev: number;
  zScore: number;
  safetyStockModules: number;
  safetyStockDays: number;
  reorderPointModules: number;
  recommendedWarehouseModules: number;
  recommendedWarehouseContainers: number;
  baselinePlannedInstallDays: number;
}

export interface DailySimulationPoint {
  day: number;
  isoDate: string;
  dateLabel: string;
  compactDateLabel: string;
  pipelineModules: number;
  atProcurement: number;
  atOcean: number;
  atPort: number;
  atInland: number;
  bufferInventory: number;
  siteInventory: number;
  totalOnHand: number;
  cumulativeArrived: number;
  cumulativeInstalled: number;
  dailyInstalled: number;
  dailyDemand: number;
  stockoutModules: number;
  demurrageContainers: number;
  p10OnHand: number;
  p50OnHand: number;
  p90OnHand: number;
}

export interface MonthlySimulationPoint {
  month: number;
  monthLabel: string;
  dayRangeLabel: string;
  modulesArrived: number;
  modulesInstalled: number;
  avgOnHandInventory: number;
  avgBufferInventory: number;
  avgPipelineWIP: number;
  stockoutModules: number;
  demurrageContainerDays: number;
  monthlyLogisticsCostUSD: number;
}

export interface BottleneckEventRecord {
  runId: number;
  batchId: string;
  stageId: StageKey;
  stageName: string;
  extraDelayDays: number;
  impactedModules: number;
}

export interface StageAttribution {
  stageId: StageKey;
  stageName: string;
  avgLeadDays: number;
  expectedBottleneckDays: number;
  shareOfVariancePct: number;
  totalDisruptedContainers: number;
}

export interface StrategySimulationResult {
  strategyId: StrategyId;
  strategyLabel: string;
  description: string;
  dailySeries: DailySimulationPoint[];
  monthlySeries: MonthlySimulationPoint[];
  avgStockoutDays: number;
  p90StockoutDays: number;
  installationContinuityPct: number; // % of install days without stockout
  avgProjectCompletionDay: number;
  scheduleSlipDays: number;
  avgDemurrageContainerDays: number;
  peakWarehouseModules: number;
  avgBufferModules: number;
  // Financial Breakdown (USD)
  procurementAndOceanCostUSD: number;
  freightAndDrayageCostUSD: number;
  warehouseLeaseCostUSD: number;
  warehouseHandlingCostUSD: number;
  workingCapitalCostUSD: number;
  portDemurrageCostUSD: number;
  idleCrewPenaltyCostUSD: number;
  totalLogisticsCostUSD: number; // excludes module hardware price for clean logistics comparison
  totalAllInCostUSD: number; // includes module hardware
  logisticsCostPerWpUSD: number;
}

export interface SensitivityPoint {
  volatilityMultiplier: number;
  label: string;
  directTotalLogisticsUSD: number;
  warehouseTotalLogisticsUSD: number;
  hybridTotalLogisticsUSD: number;
  directStockoutDays: number;
  warehouseStockoutDays: number;
}

export interface SimulationOutput {
  bufferMetrics: BufferStockMetrics;
  strategies: Record<StrategyId, StrategySimulationResult>;
  stageAttribution: StageAttribution[];
  sampleBottlenecks: BottleneckEventRecord[];
  sensitivityCurve: SensitivityPoint[];
  recommendedStrategy: StrategyId;
  maxSavingsUSD: number;
  breakEvenVolatilityMultiplier: number | null;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  subtitle: string;
  input: SupplyChainModelInput;
}
