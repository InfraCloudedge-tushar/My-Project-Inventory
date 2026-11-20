import * as XLSX from 'xlsx';
import {
  CostAssumptions,
  ProjectParameters,
  ShipmentBatch,
  SimulationOutput,
  StageKey,
  SupplyChainModelInput,
  SupplyChainStage,
} from '../types/supplyChain';

export function exportModelToExcel(
  input: SupplyChainModelInput,
  output: SimulationOutput
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Project Parameters
  const paramRows = [
    {
      Key: 'projectName',
      Label: 'Project Name',
      Value: input.params.projectName,
      Unit: 'Text',
      Notes: 'Solar farm identifier shown in dashboard header',
    },
    {
      Key: 'projectStartDate',
      Label: 'Project Start Date',
      Value: input.params.projectStartDate,
      Unit: 'YYYY-MM-DD',
      Notes: 'Calendar start date (e.g. 2026-07-01 for July 2026)',
    },
    {
      Key: 'farmCapacityMW',
      Label: 'Solar Farm DC Capacity',
      Value: input.params.farmCapacityMW,
      Unit: 'MWdc',
      Notes: 'Total nameplate capacity of solar array',
    },
    {
      Key: 'moduleWattageWp',
      Label: 'Module Wattage Rating',
      Value: input.params.moduleWattageWp,
      Unit: 'Wp',
      Notes: 'Power rating per PV module',
    },
    {
      Key: 'modulesPerContainer',
      Label: 'Modules per 40ft HC Container',
      Value: input.params.modulesPerContainer,
      Unit: 'Modules',
      Notes: 'Packing density (e.g. 20 pallets x 31 modules)',
    },
    {
      Key: 'moduleUnitPriceUSD',
      Label: 'Module Hardware Unit Price',
      Value: input.params.moduleUnitPriceUSD,
      Unit: 'USD/Module',
      Notes: 'Used for working capital holding cost calculation',
    },
    {
      Key: 'dailyInstallRate',
      Label: 'Target Daily Installation Rate',
      Value: input.params.dailyInstallRate,
      Unit: 'Modules/Day',
      Notes: 'Mean crew installation burn rate',
    },
    {
      Key: 'installRateStdDev',
      Label: 'Daily Installation Std Dev',
      Value: input.params.installRateStdDev,
      Unit: 'Modules/Day',
      Notes: 'Weather/crew daily productivity variance',
    },
    {
      Key: 'targetServiceLevelPct',
      Label: 'Target Service Level (CSL)',
      Value: input.params.targetServiceLevelPct,
      Unit: '%',
      Notes: 'Cycle service level used for z-score Safety Stock',
    },
    {
      Key: 'siteLaydownCapModules',
      Label: 'Site Laydown Yard Capacity',
      Value: input.params.siteLaydownCapModules,
      Unit: 'Modules',
      Notes: 'Max on-site storage before direct trucks/containers wait at port',
    },
    {
      Key: 'installStartDay',
      Label: 'Installation Start Day',
      Value: input.params.installStartDay,
      Unit: 'Day',
      Notes: 'Project day when mechanical installation begins',
    },
    {
      Key: 'simulationHorizonDays',
      Label: 'Simulation Horizon',
      Value: input.params.simulationHorizonDays,
      Unit: 'Days',
      Notes: 'Total simulated project timeline',
    },
    {
      Key: 'monteCarloRuns',
      Label: 'Monte Carlo Iterations',
      Value: input.params.monteCarloRuns,
      Unit: 'Runs',
      Notes: 'Number of stochastic trials (40 - 400)',
    },
    {
      Key: 'randomSeed',
      Label: 'Random Seed',
      Value: input.params.randomSeed,
      Unit: 'Integer',
      Notes: 'Seed for reproducible stochastic simulation',
    },
  ];
  const wsParams = XLSX.utils.json_to_sheet(paramRows);
  wsParams['!cols'] = [
    { wch: 24 },
    { wch: 30 },
    { wch: 36 },
    { wch: 14 },
    { wch: 52 },
  ];
  XLSX.utils.book_append_sheet(wb, wsParams, 'Project_Parameters');

  // Sheet 2: Supply Chain Stages
  const stageRows = input.stages.map((s) => ({
    Stage_ID: s.id,
    Stage_Name: s.name,
    Location: s.location,
    Mean_Lead_Days: s.meanDays,
    Std_Dev_Days: s.stdDevDays,
    Bottleneck_Prob_Pct: s.bottleneckProbPct,
    Bottleneck_Delay_Days: s.bottleneckDelayDays,
    Unit_Cost_USD_Per_Module: s.unitCostPerModule,
    Notes: s.notes,
  }));
  const wsStages = XLSX.utils.json_to_sheet(stageRows);
  wsStages['!cols'] = [
    { wch: 14 },
    { wch: 32 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 },
    { wch: 24 },
    { wch: 48 },
  ];
  XLSX.utils.book_append_sheet(wb, wsStages, 'Supply_Chain_Stages');

  // Sheet 3: Cost Assumptions
  const costRows = [
    {
      Key: 'warehouseMonthlyFixedUSD',
      Label: 'Regional Warehouse Monthly Fixed Lease',
      Value: input.costs.warehouseMonthlyFixedUSD,
      Unit: 'USD/Month',
    },
    {
      Key: 'warehouseHandlingPerModuleUSD',
      Label: 'Warehouse Double-Handling Cost',
      Value: input.costs.warehouseHandlingPerModuleUSD,
      Unit: 'USD/Module',
    },
    {
      Key: 'warehouseHoldingAnnualPct',
      Label: 'Working Capital / Carrying Rate',
      Value: input.costs.warehouseHoldingAnnualPct,
      Unit: '%/Year',
    },
    {
      Key: 'portFreeDays',
      Label: 'Port Terminal Free Time',
      Value: input.costs.portFreeDays,
      Unit: 'Days',
    },
    {
      Key: 'portDemurragePerContainerDayUSD',
      Label: 'Port Demurrage & Detention Rate',
      Value: input.costs.portDemurragePerContainerDayUSD,
      Unit: 'USD/Container/Day',
    },
    {
      Key: 'directTruckDetentionPerDayUSD',
      Label: 'Direct Site Truck Detention Rate',
      Value: input.costs.directTruckDetentionPerDayUSD,
      Unit: 'USD/Container/Day',
    },
    {
      Key: 'idleCrewCostPerDayUSD',
      Label: 'Idle Installation Crew Standby Cost',
      Value: input.costs.idleCrewCostPerDayUSD,
      Unit: 'USD/Day',
    },
    {
      Key: 'directFreightPerContainerUSD',
      Label: 'Direct Port-to-Site Freight Rate',
      Value: input.costs.directFreightPerContainerUSD,
      Unit: 'USD/Container',
    },
    {
      Key: 'warehouseInlandFreightPerContainerUSD',
      Label: 'Warehouse Hub Inland Freight Rate',
      Value: input.costs.warehouseInlandFreightPerContainerUSD,
      Unit: 'USD/Container',
    },
  ];
  const wsCosts = XLSX.utils.json_to_sheet(costRows);
  wsCosts['!cols'] = [{ wch: 36 }, { wch: 38 }, { wch: 16 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsCosts, 'Cost_Assumptions');

  // Sheet 4: Shipment Schedule
  const shipmentRows = input.shipments.map((b) => ({
    Batch_ID: b.batchId,
    Release_Day: b.releaseDay,
    Containers: b.containers,
    Modules: b.modules,
    Priority_Mode: b.priorityMode,
  }));
  const wsShipments = XLSX.utils.json_to_sheet(shipmentRows);
  wsShipments['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsShipments, 'Shipment_Schedule');

  // Sheet 5: Simulation Results & Cost-Benefit Summary
  const summaryRows = [
    output.strategies.direct,
    output.strategies.warehouse,
    output.strategies.hybrid,
  ].map((st) => ({
    Strategy: st.strategyLabel,
    Installation_Continuity_Pct: st.installationContinuityPct,
    Avg_Stockout_Days: st.avgStockoutDays,
    P90_Stockout_Days: st.p90StockoutDays,
    Avg_Completion_Day: st.avgProjectCompletionDay,
    Schedule_Slip_Days: st.scheduleSlipDays,
    Port_Demurrage_Cont_Days: st.avgDemurrageContainerDays,
    Peak_Warehouse_Modules: st.peakWarehouseModules,
    Procurement_Ocean_USD: st.procurementAndOceanCostUSD,
    Freight_Drayage_USD: st.freightAndDrayageCostUSD,
    Warehouse_Lease_USD: st.warehouseLeaseCostUSD,
    Warehouse_Handling_USD: st.warehouseHandlingCostUSD,
    Working_Capital_USD: st.workingCapitalCostUSD,
    Port_Demurrage_USD: st.portDemurrageCostUSD,
    Idle_Crew_Penalty_USD: st.idleCrewPenaltyCostUSD,
    Total_Logistics_Cost_USD: st.totalLogisticsCostUSD,
    Logistics_Cost_Per_Wp_USD: st.logisticsCostPerWpUSD,
  }));
  const wsResults = XLSX.utils.json_to_sheet(summaryRows);
  wsResults['!cols'] = Array(17).fill({ wch: 22 });
  XLSX.utils.book_append_sheet(wb, wsResults, 'Simulation_Summary');

  // Sheet 6: Daily Trajectory Comparison
  const whSeries = output.strategies.warehouse.dailySeries;
  const dirSeries = output.strategies.direct.dailySeries;
  const hybSeries = output.strategies.hybrid.dailySeries;
  const dailyRows = whSeries.map((pt, idx) => ({
    Day: pt.day,
    Calendar_Date: pt.dateLabel,
    Warehouse_OnHand_Avg: pt.totalOnHand,
    Warehouse_P10: pt.p10OnHand,
    Warehouse_P90: pt.p90OnHand,
    Warehouse_Installed_Cum: pt.cumulativeInstalled,
    Direct_Site_OnHand_Avg: dirSeries[idx]?.totalOnHand ?? 0,
    Direct_Installed_Cum: dirSeries[idx]?.cumulativeInstalled ?? 0,
    Direct_Demurrage_Containers: dirSeries[idx]?.demurrageContainers ?? 0,
    Hybrid_OnHand_Avg: hybSeries[idx]?.totalOnHand ?? 0,
    Hybrid_Installed_Cum: hybSeries[idx]?.cumulativeInstalled ?? 0,
  }));
  const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
  wsDaily['!cols'] = Array(11).fill({ wch: 22 });
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily_Simulation_Curve');

  // Sheet 7: Month-Wise & Previous-Month Comparison
  const whMonthly = output.strategies.warehouse.monthlySeries;
  const dirMonthly = output.strategies.direct.monthlySeries;
  const monthlyRows = whMonthly.map((m, idx) => {
    const prev = idx > 0 ? whMonthly[idx - 1] : undefined;
    return {
      Month: m.monthLabel,
      Day_Range: m.dayRangeLabel,
      WH_Modules_Arrived: m.modulesArrived,
      WH_Modules_Installed: m.modulesInstalled,
      WH_MoM_Installed_Delta: prev ? m.modulesInstalled - prev.modulesInstalled : 0,
      WH_Avg_Buffer_Inventory: m.avgOnHandInventory,
      WH_Monthly_Cost_USD: m.monthlyLogisticsCostUSD,
      Direct_Modules_Installed: dirMonthly[idx]?.modulesInstalled ?? 0,
      Direct_Stockout_Modules: dirMonthly[idx]?.stockoutModules ?? 0,
      Direct_Monthly_Cost_USD: dirMonthly[idx]?.monthlyLogisticsCostUSD ?? 0,
    };
  });
  const wsMonthly = XLSX.utils.json_to_sheet(monthlyRows);
  wsMonthly['!cols'] = Array(10).fill({ wch: 24 });
  XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly_Comparison');

  const safeSlug = input.params.projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  XLSX.writeFile(wb, `${safeSlug || 'solar_supply_chain'}_model.xlsx`);
}

export interface ExcelImportResult {
  input: SupplyChainModelInput;
  warnings: string[];
  updatedSections: string[];
}

function toFiniteNumber(val: unknown, fallback: number): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[$,%\s,]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export async function importModelFromExcelFile(
  file: File,
  currentInput: SupplyChainModelInput
): Promise<ExcelImportResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const nextParams: ProjectParameters = { ...currentInput.params };
  const nextCosts: CostAssumptions = { ...currentInput.costs };
  let nextStages: SupplyChainStage[] = currentInput.stages.map((s) => ({ ...s }));
  let nextShipments: ShipmentBatch[] = currentInput.shipments.map((b) => ({ ...b }));

  const warnings: string[] = [];
  const updatedSections: string[] = [];

  // 1. Parse Project_Parameters
  if (wb.SheetNames.includes('Project_Parameters')) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets['Project_Parameters']
    );
    for (const row of rows) {
      const key = String(row['Key'] ?? row['key'] ?? '').trim();
      const rawVal = row['Value'] ?? row['value'];
      if (!key || rawVal === undefined) continue;

      switch (key) {
        case 'projectName':
          nextParams.projectName = String(rawVal).trim() || nextParams.projectName;
          break;
        case 'projectStartDate': {
          const parsedDate = String(rawVal).trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(parsedDate)) {
            nextParams.projectStartDate = parsedDate.slice(0, 10);
          }
          break;
        }
        case 'farmCapacityMW':
          nextParams.farmCapacityMW = Math.max(1, toFiniteNumber(rawVal, nextParams.farmCapacityMW));
          break;
        case 'moduleWattageWp':
          nextParams.moduleWattageWp = Math.max(100, toFiniteNumber(rawVal, nextParams.moduleWattageWp));
          break;
        case 'modulesPerContainer':
          nextParams.modulesPerContainer = Math.max(100, toFiniteNumber(rawVal, nextParams.modulesPerContainer));
          break;
        case 'moduleUnitPriceUSD':
          nextParams.moduleUnitPriceUSD = Math.max(10, toFiniteNumber(rawVal, nextParams.moduleUnitPriceUSD));
          break;
        case 'dailyInstallRate':
          nextParams.dailyInstallRate = Math.max(50, toFiniteNumber(rawVal, nextParams.dailyInstallRate));
          break;
        case 'installRateStdDev':
          nextParams.installRateStdDev = Math.max(0, toFiniteNumber(rawVal, nextParams.installRateStdDev));
          break;
        case 'targetServiceLevelPct':
          nextParams.targetServiceLevelPct = Math.min(99.9, Math.max(50, toFiniteNumber(rawVal, nextParams.targetServiceLevelPct)));
          break;
        case 'siteLaydownCapModules':
          nextParams.siteLaydownCapModules = Math.max(500, toFiniteNumber(rawVal, nextParams.siteLaydownCapModules));
          break;
        case 'installStartDay':
          nextParams.installStartDay = Math.max(1, Math.round(toFiniteNumber(rawVal, nextParams.installStartDay)));
          break;
        case 'simulationHorizonDays':
          nextParams.simulationHorizonDays = Math.min(400, Math.max(60, Math.round(toFiniteNumber(rawVal, nextParams.simulationHorizonDays))));
          break;
        case 'monteCarloRuns':
          nextParams.monteCarloRuns = Math.min(400, Math.max(40, Math.round(toFiniteNumber(rawVal, nextParams.monteCarloRuns))));
          break;
        case 'randomSeed':
          nextParams.randomSeed = Math.max(1, Math.round(toFiniteNumber(rawVal, nextParams.randomSeed)));
          break;
      }
    }
    updatedSections.push('Project Parameters');
  } else {
    warnings.push('Sheet "Project_Parameters" not found; kept existing project parameters.');
  }

  // 2. Parse Supply_Chain_Stages
  if (wb.SheetNames.includes('Supply_Chain_Stages')) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets['Supply_Chain_Stages']
    );
    const validIds: StageKey[] = ['procurement', 'ocean', 'port', 'drayage', 'staging'];
    const parsedStages: SupplyChainStage[] = [];
    for (const row of rows) {
      const idRaw = String(row['Stage_ID'] ?? '').trim().toLowerCase() as StageKey;
      if (!validIds.includes(idRaw)) continue;
      const existing = currentInput.stages.find((s) => s.id === idRaw);
      parsedStages.push({
        id: idRaw,
        name: String(row['Stage_Name'] ?? existing?.name ?? idRaw),
        location: String(row['Location'] ?? existing?.location ?? ''),
        meanDays: Math.max(0, toFiniteNumber(row['Mean_Lead_Days'], existing?.meanDays ?? 0)),
        stdDevDays: Math.max(0, toFiniteNumber(row['Std_Dev_Days'], existing?.stdDevDays ?? 0)),
        bottleneckProbPct: Math.min(100, Math.max(0, toFiniteNumber(row['Bottleneck_Prob_Pct'], existing?.bottleneckProbPct ?? 0))),
        bottleneckDelayDays: Math.max(0, toFiniteNumber(row['Bottleneck_Delay_Days'], existing?.bottleneckDelayDays ?? 0)),
        unitCostPerModule: Math.max(0, toFiniteNumber(row['Unit_Cost_USD_Per_Module'], existing?.unitCostPerModule ?? 0)),
        notes: String(row['Notes'] ?? existing?.notes ?? ''),
      });
    }
    if (parsedStages.length > 0) {
      // Preserve canonical order
      nextStages = validIds.map(
        (id) =>
          parsedStages.find((s) => s.id === id) ??
          currentInput.stages.find((s) => s.id === id)!
      );
      updatedSections.push('Supply Chain Stages');
    }
  } else {
    warnings.push('Sheet "Supply_Chain_Stages" not found; kept existing stage definitions.');
  }

  // 3. Parse Cost_Assumptions
  if (wb.SheetNames.includes('Cost_Assumptions')) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets['Cost_Assumptions']
    );
    for (const row of rows) {
      const key = String(row['Key'] ?? row['key'] ?? '').trim();
      const rawVal = row['Value'] ?? row['value'];
      if (!key || rawVal === undefined) continue;
      if (key in nextCosts) {
        (nextCosts as unknown as Record<string, number>)[key] = Math.max(
          0,
          toFiniteNumber(rawVal, (nextCosts as unknown as Record<string, number>)[key])
        );
      }
    }
    updatedSections.push('Cost Assumptions');
  } else {
    warnings.push('Sheet "Cost_Assumptions" not found; kept existing cost assumptions.');
  }

  // 4. Parse Shipment_Schedule (or single-sheet CSV fallback)
  const shipmentSheetName = wb.SheetNames.includes('Shipment_Schedule')
    ? 'Shipment_Schedule'
    : wb.SheetNames.length === 1
      ? wb.SheetNames[0]
      : null;

  if (shipmentSheetName) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets[shipmentSheetName]
    );
    const parsedBatches: ShipmentBatch[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const containers = Math.round(
        toFiniteNumber(row['Containers'] ?? row['containers'], 0)
      );
      const releaseDay = Math.round(
        toFiniteNumber(row['Release_Day'] ?? row['releaseDay'], 0)
      );
      if (containers <= 0 || releaseDay <= 0) continue;
      const modulesVal = toFiniteNumber(
        row['Modules'] ?? row['modules'],
        containers * nextParams.modulesPerContainer
      );
      const modeRaw = String(row['Priority_Mode'] ?? 'standard').toLowerCase();
      const priorityMode =
        modeRaw === 'expedited' || modeRaw === 'buffer' ? modeRaw : 'standard';

      parsedBatches.push({
        batchId: String(row['Batch_ID'] ?? `WV-${String(i + 1).padStart(2, '0')}`),
        releaseDay,
        containers,
        modules: Math.round(modulesVal),
        priorityMode,
      });
    }
    if (parsedBatches.length > 0) {
      nextShipments = parsedBatches.sort((a, b) => a.releaseDay - b.releaseDay);
      updatedSections.push(`Shipment Schedule (${parsedBatches.length} batches)`);
    }
  }

  if (updatedSections.length === 0) {
    throw new Error(
      'No compatible worksheets found. Download the Excel template from the dashboard first and keep sheet names intact.'
    );
  }

  return {
    input: {
      params: nextParams,
      stages: nextStages,
      costs: nextCosts,
      shipments: nextShipments,
    },
    warnings,
    updatedSections,
  };
}
