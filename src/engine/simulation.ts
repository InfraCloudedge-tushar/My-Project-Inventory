import {
  BottleneckEventRecord,
  BufferStockMetrics,
  DailySimulationPoint,
  MonthlySimulationPoint,
  SensitivityPoint,
  SimulationOutput,
  StageAttribution,
  StageKey,
  StrategyId,
  StrategySimulationResult,
  SupplyChainModelInput,
} from '../types/supplyChain';
import {
  addDaysUTC,
  formatCompactDateUTC,
  formatMonthYearUTC,
  formatShortDateUTC,
} from '../utils/formatters';

// Deterministic Mulberry32 PRNG
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller standard normal draw
function sampleNormal(rng: () => number): number {
  let u1 = rng();
  let u2 = rng();
  if (u1 < 1e-9) u1 = 1e-9;
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// Acklam's inverse normal CDF approximation for exact service level z-score
export function normalQuantile(p: number): number {
  const clamped = Math.min(0.9999, Math.max(0.5, p));
  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.38357751867269e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239e0;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838e0;
  const c4 = -2.549732539343734e0;
  const c5 = 4.374664141464968e0;
  const c6 = 2.938163982698783e0;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996e0;
  const d4 = 3.754408661907416e0;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (clamped < pLow) {
    const q = Math.sqrt(-2 * Math.log(clamped));
    return (
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
  if (clamped <= pHigh) {
    const q = clamped - 0.5;
    const r = q * q;
    return (
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - clamped));
  return (
    -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
    ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  );
}

export function computeBufferMetrics(
  input: SupplyChainModelInput,
  volatilityMultiplier = 1
): BufferStockMetrics {
  const { params, stages } = input;
  const totalModulesRequired = Math.ceil(
    (params.farmCapacityMW * 1_000_000) / Math.max(1, params.moduleWattageWp)
  );
  const totalContainersRequired = Math.ceil(
    totalModulesRequired / Math.max(1, params.modulesPerContainer)
  );

  let nominalLeadTimeDays = 0;
  let effectiveMeanLeadTimeDays = 0;
  let totalLeadVariance = 0;

  for (const s of stages) {
    const p = Math.min(1, Math.max(0, s.bottleneckProbPct / 100));
    const d = Math.max(0, s.bottleneckDelayDays * volatilityMultiplier);
    const sd = Math.max(0, s.stdDevDays * volatilityMultiplier);

    nominalLeadTimeDays += s.meanDays;
    effectiveMeanLeadTimeDays += s.meanDays + p * d;
    // Total variance = continuous transit variance + Bernoulli bottleneck variance
    totalLeadVariance += sd * sd + p * (1 - p) * d * d;
  }

  const combinedLeadTimeStdDev = Math.sqrt(totalLeadVariance);
  const zScore = normalQuantile(params.targetServiceLevelPct / 100);

  const dailyDemand = Math.max(1, params.dailyInstallRate);
  const demandSd = Math.max(0, params.installRateStdDev);

  // King's formula for combined demand & lead-time uncertainty
  const safetyStockRaw =
    zScore *
    Math.sqrt(
      effectiveMeanLeadTimeDays * demandSd * demandSd +
        dailyDemand * dailyDemand * totalLeadVariance
    );

  const safetyStockModules = Math.round(safetyStockRaw);
  const safetyStockDays = Number((safetyStockModules / dailyDemand).toFixed(1));
  const reorderPointModules = Math.round(
    dailyDemand * effectiveMeanLeadTimeDays + safetyStockModules
  );

  // Recommended warehouse footprint accommodates Safety Stock + ~2.5 days surge receiving buffer
  const recommendedWarehouseModules = Math.round(safetyStockModules + dailyDemand * 2.5);
  const recommendedWarehouseContainers = Math.ceil(
    recommendedWarehouseModules / Math.max(1, params.modulesPerContainer)
  );

  const baselinePlannedInstallDays = Math.ceil(totalModulesRequired / dailyDemand);

  return {
    totalModulesRequired,
    totalContainersRequired,
    nominalLeadTimeDays: Number(nominalLeadTimeDays.toFixed(1)),
    effectiveMeanLeadTimeDays: Number(effectiveMeanLeadTimeDays.toFixed(1)),
    combinedLeadTimeStdDev: Number(combinedLeadTimeStdDev.toFixed(2)),
    zScore: Number(zScore.toFixed(3)),
    safetyStockModules,
    safetyStockDays,
    reorderPointModules,
    recommendedWarehouseModules,
    recommendedWarehouseContainers,
    baselinePlannedInstallDays,
  };
}

interface BatchRunTimeline {
  batchId: string;
  modules: number;
  containers: number;
  releaseDay: number;
  procEnd: number;
  oceanEnd: number;
  portEnd: number;
  drayEnd: number;
  siteEnd: number;
  portIntrinsicDwell: number;
}

interface RealizationSample {
  batches: BatchRunTimeline[];
  dailyDemandNoise: number[];
}

function generateMonteCarloRealizations(
  input: SupplyChainModelInput,
  runs: number,
  volatilityMultiplier: number
): {
  realizations: RealizationSample[];
  stageAttribution: StageAttribution[];
  sampleBottlenecks: BottleneckEventRecord[];
} {
  const { params, stages, shipments } = input;
  const rng = createRng(params.randomSeed + Math.round(volatilityMultiplier * 100));
  const horizon = Math.max(60, params.simulationHorizonDays);

  const stageMap = new Map(stages.map((s) => [s.id, s]));
  const orderedStageIds: StageKey[] = ['procurement', 'ocean', 'port', 'drayage', 'staging'];

  const totalExtraDelayByStage: Record<StageKey, number> = {
    procurement: 0,
    ocean: 0,
    port: 0,
    drayage: 0,
    staging: 0,
  };
  const disruptedContainersByStage: Record<StageKey, number> = {
    procurement: 0,
    ocean: 0,
    port: 0,
    drayage: 0,
    staging: 0,
  };
  const varianceByStage: Record<StageKey, number> = {
    procurement: 0,
    ocean: 0,
    port: 0,
    drayage: 0,
    staging: 0,
  };

  let totalVarianceSum = 0;
  for (const sid of orderedStageIds) {
    const s = stageMap.get(sid);
    if (!s) continue;
    const p = Math.min(1, Math.max(0, s.bottleneckProbPct / 100));
    const d = Math.max(0, s.bottleneckDelayDays * volatilityMultiplier);
    const sd = Math.max(0, s.stdDevDays * volatilityMultiplier);
    const v = sd * sd + p * (1 - p) * d * d;
    varianceByStage[sid] = v;
    totalVarianceSum += v;
  }

  const realizations: RealizationSample[] = [];
  const sampleBottlenecks: BottleneckEventRecord[] = [];

  for (let r = 0; r < runs; r++) {
    const batchTimelines: BatchRunTimeline[] = [];

    for (const batch of shipments) {
      let cursor = batch.releaseDay;
      const stageDurations: Record<StageKey, number> = {
        procurement: 0,
        ocean: 0,
        port: 0,
        drayage: 0,
        staging: 0,
      };

      for (const sid of orderedStageIds) {
        const s = stageMap.get(sid);
        if (!s || (s.meanDays <= 0 && s.stdDevDays <= 0)) {
          stageDurations[sid] = 0;
          continue;
        }
        const sd = Math.max(0, s.stdDevDays * volatilityMultiplier);
        const normalDraw = s.meanDays + sampleNormal(rng) * sd;
        let duration = Math.max(0.5, normalDraw);

        const p = Math.min(1, Math.max(0, s.bottleneckProbPct / 100));
        if (rng() < p && s.bottleneckDelayDays > 0) {
          const extra =
            s.bottleneckDelayDays * volatilityMultiplier * (0.75 + 0.5 * rng());
          duration += extra;
          totalExtraDelayByStage[sid] += extra;
          disruptedContainersByStage[sid] += batch.containers;

          if (r < 4 && sampleBottlenecks.length < 28) {
            sampleBottlenecks.push({
              runId: r + 1,
              batchId: batch.batchId,
              stageId: sid,
              stageName: s.name,
              extraDelayDays: Number(extra.toFixed(1)),
              impactedModules: batch.modules,
            });
          }
        }
        stageDurations[sid] = Math.round(duration);
      }

      const procEnd = cursor + stageDurations.procurement;
      const oceanEnd = procEnd + stageDurations.ocean;
      const portEnd = oceanEnd + stageDurations.port;
      const drayEnd = portEnd + stageDurations.drayage;
      const siteEnd = drayEnd + stageDurations.staging;

      batchTimelines.push({
        batchId: batch.batchId,
        modules: batch.modules,
        containers: batch.containers,
        releaseDay: batch.releaseDay,
        procEnd,
        oceanEnd,
        portEnd,
        drayEnd,
        siteEnd,
        portIntrinsicDwell: stageDurations.port,
      });
    }

    const dailyDemandNoise: number[] = new Array(horizon + 1);
    for (let day = 0; day <= horizon; day++) {
      const demand = Math.max(
        0,
        Math.round(params.dailyInstallRate + sampleNormal(rng) * params.installRateStdDev)
      );
      dailyDemandNoise[day] = demand;
    }

    realizations.push({
      batches: batchTimelines,
      dailyDemandNoise,
    });
  }

  const totalShipments = Math.max(1, shipments.length * runs);
  const stageAttribution: StageAttribution[] = orderedStageIds.map((sid) => {
    const s = stageMap.get(sid);
    const p = s ? Math.min(1, Math.max(0, s.bottleneckProbPct / 100)) : 0;
    const d = s ? s.bottleneckDelayDays * volatilityMultiplier : 0;
    return {
      stageId: sid,
      stageName: s?.name ?? sid,
      avgLeadDays: s ? Number((s.meanDays + p * d).toFixed(1)) : 0,
      expectedBottleneckDays: Number((totalExtraDelayByStage[sid] / totalShipments).toFixed(2)),
      shareOfVariancePct:
        totalVarianceSum > 0
          ? Number(((varianceByStage[sid] / totalVarianceSum) * 100).toFixed(1))
          : 0,
      totalDisruptedContainers: Math.round(disruptedContainersByStage[sid] / runs),
    };
  });

  return { realizations, stageAttribution, sampleBottlenecks };
}

function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = (sortedArr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

function evaluateStrategy(
  strategyId: StrategyId,
  input: SupplyChainModelInput,
  bufferMetrics: BufferStockMetrics,
  realizations: RealizationSample[]
): StrategySimulationResult {
  const { params, stages, costs } = input;
  const horizon = Math.max(60, params.simulationHorizonDays);
  const runs = realizations.length;
  const modPerCont = Math.max(1, params.modulesPerContainer);
  const totalProjectModules = bufferMetrics.totalModulesRequired;
  const totalProjectContainers = bufferMetrics.totalContainersRequired;

  // Per-day aggregates across all Monte Carlo runs
  const onHandSamplesByDay: number[][] = Array.from({ length: horizon + 1 }, () => []);
  const sumPipeline = new Float64Array(horizon + 1);
  const sumAtProc = new Float64Array(horizon + 1);
  const sumAtOcean = new Float64Array(horizon + 1);
  const sumAtPort = new Float64Array(horizon + 1);
  const sumAtInland = new Float64Array(horizon + 1);
  const sumBufferInv = new Float64Array(horizon + 1);
  const sumSiteInv = new Float64Array(horizon + 1);
  const sumCumArrived = new Float64Array(horizon + 1);
  const sumCumInstalled = new Float64Array(horizon + 1);
  const sumDailyInstalled = new Float64Array(horizon + 1);
  const sumDailyDemand = new Float64Array(horizon + 1);
  const sumStockoutMod = new Float64Array(horizon + 1);
  const sumDemurrageCont = new Float64Array(horizon + 1);

  const stockoutDaysPerRun: number[] = [];
  let sumContinuityPct = 0;
  let sumCompletionDay = 0;
  let sumDemurrageContDays = 0;
  let sumPeakWarehouseMod = 0;
  let sumAvgBufferMod = 0;
  let sumWarehouseHandledModules = 0;
  let sumDirectContainers = 0;
  let sumWarehouseContainers = 0;
  let sumTruckDetentionContDays = 0;

  // Staging delay lookup
  const stageStaging = stages.find((s) => s.id === 'staging');
  const stageDray = stages.find((s) => s.id === 'drayage');
  const drayMean = Math.max(1, Math.round(stageDray?.meanDays ?? 3));
  const stagingMean = Math.max(1, Math.round(stageStaging?.meanDays ?? 2));

  const targetSiteBufferForWarehouse = Math.min(
    params.siteLaydownCapModules,
    Math.max(params.dailyInstallRate * 2.5, 4500)
  );

  for (let r = 0; r < runs; r++) {
    const sample = realizations[r];
    let bufferInv = 0;
    let siteInv = 0;
    let cumArrived = 0;
    let cumInstalled = 0;
    let stockoutDays = 0;
    let activeInstallDays = 0;
    let completionDay = horizon;
    let demurrageContDays = 0;
    let truckDetentionContDays = 0;
    let peakWarehouseMod = 0;
    let bufferModDaySum = 0;
    let warehouseHandledMod = 0;
    let directCont = 0;
    let whCont = 0;

    // Queue of containers waiting at port because site laydown is full (Direct / Hybrid)
    interface HeldContainerLot {
      modules: number;
      containers: number;
      portArrivalDay: number;
      readyDay: number;
    }
    const portBlockedQueue: HeldContainerLot[] = [];
    // Scheduled warehouse->site replenishment transit arrivals
    const whTransferArrivals = new Float64Array(horizon + 10);

    for (let day = 1; day <= horizon; day++) {
      let atProc = 0;
      let atOcean = 0;
      let atPort = 0;
      let atInland = 0;

      // Track WIP and arrivals for each batch
      for (const b of sample.batches) {
        if (day >= b.releaseDay && day < b.procEnd) {
          atProc += b.modules;
        } else if (day >= b.procEnd && day < b.oceanEnd) {
          atOcean += b.modules;
        } else if (day >= b.oceanEnd && day < b.portEnd) {
          atPort += b.modules;
          // Intrinsic customs hold past free days triggers port demurrage in ALL strategies if port dwell > freeDays
          const daysInPortSoFar = day - b.oceanEnd + 1;
          if (daysInPortSoFar > costs.portFreeDays) {
            // In warehouse/hybrid, customs hold still incurs demurrage only while customs hasn't released;
            // once released, warehouse pulls immediately.
            demurrageContDays += b.containers;
            sumDemurrageCont[day] += b.containers;
          }
        } else if (day >= b.portEnd && day < b.drayEnd) {
          atInland += b.modules;
        }

        // Batch clears port on b.portEnd (for Warehouse) or reaches site on b.siteEnd (for Direct)
        if (strategyId === 'warehouse') {
          if (day === b.drayEnd) {
            bufferInv += b.modules;
            cumArrived += b.modules;
            warehouseHandledMod += b.modules;
            whCont += b.containers;
          }
        } else if (strategyId === 'direct') {
          if (day === b.siteEnd) {
            if (siteInv + b.modules <= params.siteLaydownCapModules) {
              siteInv += b.modules;
              cumArrived += b.modules;
              directCont += b.containers;
            } else {
              // Site laydown full -> excess must wait in port/gate queue
              const room = Math.max(0, params.siteLaydownCapModules - siteInv);
              const overflow = b.modules - room;
              if (room > 0) {
                siteInv += room;
                cumArrived += room;
                directCont += room / modPerCont;
              }
              portBlockedQueue.push({
                modules: overflow,
                containers: overflow / modPerCont,
                portArrivalDay: b.oceanEnd,
                readyDay: day,
              });
              directCont += overflow / modPerCont;
            }
          }
        } else {
          // Hybrid Strategy: Maintain optimal Safety Stock buffer in regional cross-dock;
          // route directly to site when site has space & buffer is at target!
          if (day === b.drayEnd) {
            const targetSS = bufferMetrics.safetyStockModules;
            if (bufferInv < targetSS * 1.1) {
              bufferInv += b.modules;
              cumArrived += b.modules;
              warehouseHandledMod += b.modules;
              whCont += b.containers;
            } else if (siteInv + b.modules <= params.siteLaydownCapModules) {
              // Route directly to site staging (arrives after stagingMean)
              const arrivalIdx = Math.min(horizon, day + stagingMean);
              whTransferArrivals[arrivalIdx] += b.modules;
              cumArrived += b.modules;
              directCont += b.containers;
            } else {
              // Overflow goes to regional buffer instead of paying port demurrage!
              bufferInv += b.modules;
              cumArrived += b.modules;
              warehouseHandledMod += b.modules;
              whCont += b.containers;
            }
          }
        }
      }

      // Release port-blocked containers in Direct strategy if site space opens up
      if (strategyId === 'direct' && portBlockedQueue.length > 0) {
        while (portBlockedQueue.length > 0 && siteInv < params.siteLaydownCapModules) {
          const head = portBlockedQueue[0];
          const room = params.siteLaydownCapModules - siteInv;
          const move = Math.min(room, head.modules);
          siteInv += move;
          cumArrived += move;
          head.modules -= move;
          head.containers = head.modules / modPerCont;
          if (head.modules <= 1) {
            portBlockedQueue.shift();
          } else {
            break;
          }
        }
        // Remaining blocked containers incur demurrage / truck detention
        for (const held of portBlockedQueue) {
          atPort += held.modules;
          if (day - held.portArrivalDay >= costs.portFreeDays) {
            demurrageContDays += held.containers;
            sumDemurrageCont[day] += held.containers;
          } else {
            truckDetentionContDays += held.containers;
          }
        }
      }

      // Warehouse -> Site daily milk-run replenishment
      if (strategyId === 'warehouse' || strategyId === 'hybrid') {
        if (whTransferArrivals[day] > 0) {
          siteInv += whTransferArrivals[day];
        }
        if (day >= params.installStartDay - drayMean && bufferInv > 0) {
          const desiredSite =
            strategyId === 'warehouse'
              ? targetSiteBufferForWarehouse
              : Math.min(params.siteLaydownCapModules, params.dailyInstallRate * 2.2);
          const deficit = Math.max(0, desiredSite - siteInv);
          if (deficit > 0) {
            const pull = Math.min(bufferInv, deficit);
            bufferInv -= pull;
            // Short 1-day regional drayage from warehouse to solar site
            if (day + 1 <= horizon) {
              whTransferArrivals[day + 1] += pull;
            }
          }
        }
      }

      // Site installation demand
      const remainingProjectNeed = Math.max(0, totalProjectModules - cumInstalled);
      let dailyDemand = 0;
      let installedToday = 0;
      let stockoutModToday = 0;

      if (day >= params.installStartDay && remainingProjectNeed > 0) {
        dailyDemand = Math.min(remainingProjectNeed, sample.dailyDemandNoise[day]);
        if (dailyDemand > 0) {
          activeInstallDays++;
          if (siteInv >= dailyDemand) {
            installedToday = dailyDemand;
            siteInv -= dailyDemand;
          } else {
            installedToday = siteInv;
            stockoutModToday = dailyDemand - siteInv;
            siteInv = 0;
            // Fractional stockout day weighted by unmet demand ratio
            if (stockoutModToday > dailyDemand * 0.15) {
              stockoutDays += stockoutModToday / dailyDemand;
            }
          }
          cumInstalled += installedToday;
          if (cumInstalled >= totalProjectModules - 1 && completionDay === horizon) {
            completionDay = day;
          }
        }
      }

      const totalOnHand = bufferInv + siteInv;
      const pipeline = atProc + atOcean + atPort + atInland;

      peakWarehouseMod = Math.max(peakWarehouseMod, bufferInv);
      bufferModDaySum += bufferInv;

      onHandSamplesByDay[day].push(totalOnHand);
      sumPipeline[day] += pipeline;
      sumAtProc[day] += atProc;
      sumAtOcean[day] += atOcean;
      sumAtPort[day] += atPort;
      sumAtInland[day] += atInland;
      sumBufferInv[day] += bufferInv;
      sumSiteInv[day] += siteInv;
      sumCumArrived[day] += cumArrived;
      sumCumInstalled[day] += cumInstalled;
      sumDailyInstalled[day] += installedToday;
      sumDailyDemand[day] += dailyDemand;
      sumStockoutMod[day] += stockoutModToday;
    }

    stockoutDaysPerRun.push(stockoutDays);
    const continuity =
      activeInstallDays > 0
        ? Math.max(0, ((activeInstallDays - stockoutDays) / activeInstallDays) * 100)
        : 100;
    sumContinuityPct += continuity;
    sumCompletionDay += completionDay;
    sumDemurrageContDays += demurrageContDays;
    sumTruckDetentionContDays += truckDetentionContDays;
    sumPeakWarehouseMod += peakWarehouseMod;
    sumAvgBufferMod += bufferModDaySum / horizon;
    sumWarehouseHandledModules += warehouseHandledMod;
    sumDirectContainers += directCont;
    sumWarehouseContainers += whCont;
  }

  // Build daily simulation time-series with P10/P50/P90 envelopes and real calendar dates
  const dailySeries: DailySimulationPoint[] = [];
  for (let day = 1; day <= horizon; day++) {
    const sortedOnHand = onHandSamplesByDay[day].slice().sort((a, b) => a - b);
    const calDate = addDaysUTC(params.projectStartDate, day - 1);
    const isoDate = calDate.toISOString().slice(0, 10);
    dailySeries.push({
      day,
      isoDate,
      dateLabel: formatShortDateUTC(calDate),
      compactDateLabel: formatCompactDateUTC(calDate),
      pipelineModules: Math.round(sumPipeline[day] / runs),
      atProcurement: Math.round(sumAtProc[day] / runs),
      atOcean: Math.round(sumAtOcean[day] / runs),
      atPort: Math.round(sumAtPort[day] / runs),
      atInland: Math.round(sumAtInland[day] / runs),
      bufferInventory: Math.round(sumBufferInv[day] / runs),
      siteInventory: Math.round(sumSiteInv[day] / runs),
      totalOnHand: Math.round((sumBufferInv[day] + sumSiteInv[day]) / runs),
      cumulativeArrived: Math.round(sumCumArrived[day] / runs),
      cumulativeInstalled: Math.round(sumCumInstalled[day] / runs),
      dailyInstalled: Math.round(sumDailyInstalled[day] / runs),
      dailyDemand: Math.round(sumDailyDemand[day] / runs),
      stockoutModules: Math.round(sumStockoutMod[day] / runs),
      demurrageContainers: Number((sumDemurrageCont[day] / runs).toFixed(1)),
      p10OnHand: Math.round(percentile(sortedOnHand, 0.1)),
      p50OnHand: Math.round(percentile(sortedOnHand, 0.5)),
      p90OnHand: Math.round(percentile(sortedOnHand, 0.9)),
    });
  }

  const sortedStockouts = stockoutDaysPerRun.slice().sort((a, b) => a - b);
  const avgStockoutDays = Number(
    (stockoutDaysPerRun.reduce((acc, v) => acc + v, 0) / runs).toFixed(1)
  );
  const p90StockoutDays = Number(percentile(sortedStockouts, 0.9).toFixed(1));
  const avgCompletionDay = Math.round(sumCompletionDay / runs);
  const plannedFinishDay =
    params.installStartDay + bufferMetrics.baselinePlannedInstallDays - 1;
  const scheduleSlipDays = Math.max(0, avgCompletionDay - plannedFinishDay);

  const avgDemurrageContDays = Number((sumDemurrageContDays / runs).toFixed(1));
  const avgTruckDetentionContDays = sumTruckDetentionContDays / runs;
  const peakWarehouseModules = Math.round(sumPeakWarehouseMod / runs);
  const avgBufferModules = Math.round(sumAvgBufferMod / runs);
  const avgWhHandledMod = sumWarehouseHandledModules / runs;
  const avgDirectCont = sumDirectContainers / runs;
  const avgWhCont = sumWarehouseContainers / runs;

  // Financial Breakdown
  const stageUnitCostSum = stages.reduce((acc, s) => acc + s.unitCostPerModule, 0);
  const procurementAndOceanCostUSD = Math.round(totalProjectModules * stageUnitCostSum);

  const freightAndDrayageCostUSD = Math.round(
    avgDirectCont * costs.directFreightPerContainerUSD +
      avgWhCont * costs.warehouseInlandFreightPerContainerUSD
  );

  // Active warehouse lease months during farm construction window
  const activeMonths = Math.max(
    1,
    (avgCompletionDay - Math.max(1, params.installStartDay - 20)) / 30
  );
  const warehouseLeaseCostUSD =
    strategyId === 'direct'
      ? 0
      : strategyId === 'warehouse'
        ? Math.round(activeMonths * costs.warehouseMonthlyFixedUSD)
        : Math.round(activeMonths * costs.warehouseMonthlyFixedUSD * 0.65);

  const warehouseHandlingCostUSD =
    strategyId === 'direct'
      ? 0
      : Math.round(avgWhHandledMod * costs.warehouseHandlingPerModuleUSD);

  const workingCapitalCostUSD = Math.round(
    avgBufferModules *
      params.moduleUnitPriceUSD *
      (costs.warehouseHoldingAnnualPct / 100) *
      (horizon / 365)
  );

  const portDemurrageCostUSD = Math.round(
    avgDemurrageContDays * costs.portDemurragePerContainerDayUSD +
      avgTruckDetentionContDays * costs.directTruckDetentionPerDayUSD
  );

  const idleCrewPenaltyCostUSD = Math.round(avgStockoutDays * costs.idleCrewCostPerDayUSD);

  // Total Logistics Cost (excludes raw hardware price so logistics delta is crystal clear)
  const totalLogisticsCostUSD =
    procurementAndOceanCostUSD +
    freightAndDrayageCostUSD +
    warehouseLeaseCostUSD +
    warehouseHandlingCostUSD +
    workingCapitalCostUSD +
    portDemurrageCostUSD +
    idleCrewPenaltyCostUSD;

  const totalAllInCostUSD =
    totalLogisticsCostUSD + Math.round(totalProjectModules * params.moduleUnitPriceUSD);

  const totalWp = params.farmCapacityMW * 1_000_000;
  const logisticsCostPerWpUSD = Number((totalLogisticsCostUSD / totalWp).toFixed(4));

  const meta: Record<StrategyId, { label: string; desc: string }> = {
    direct: {
      label: 'Direct-to-Site (JIT)',
      desc: 'Zero intermediate warehouse. Containers haul direct from port to farm laydown yard; excess waits at port.',
    },
    warehouse: {
      label: 'Regional Buffer Warehouse',
      desc: 'All containers clear port immediately into leased regional hub; feeds site daily to prevent stockouts & demurrage.',
    },
    hybrid: {
      label: 'Optimized Hybrid Buffer',
      desc: 'Holds target Safety Stock (SS) in cross-dock buffer while routing steady-state containers directly to site.',
    },
  };

  // Build monthly aggregated metrics grouped by actual calendar month (e.g. July 2026, August 2026...)
  const monthlySeries: MonthlySimulationPoint[] = [];
  const monthBuckets: Array<{
    ymKey: string;
    monthLabel: string;
    startIdx: number;
    endIdx: number;
  }> = [];

  for (let i = 0; i < dailySeries.length; i++) {
    const ymKey = dailySeries[i].isoDate.slice(0, 7);
    const lastBucket = monthBuckets[monthBuckets.length - 1];
    if (!lastBucket || lastBucket.ymKey !== ymKey) {
      const calDate = addDaysUTC(params.projectStartDate, i);
      monthBuckets.push({
        ymKey,
        monthLabel: formatMonthYearUTC(calDate),
        startIdx: i,
        endIdx: i + 1,
      });
    } else {
      lastBucket.endIdx = i + 1;
    }
  }

  const totalMonths = monthBuckets.length;
  const totalArrivedAll = Math.max(
    1,
    dailySeries[dailySeries.length - 1]?.cumulativeArrived ?? 1
  );
  const totalInstalledAll = Math.max(
    1,
    dailySeries[dailySeries.length - 1]?.cumulativeInstalled ?? 1
  );
  const totalStockoutModAll = Math.max(
    1,
    dailySeries.reduce((acc, d) => acc + d.stockoutModules, 0)
  );
  const totalDemurrageAll = Math.max(
    1,
    dailySeries.reduce((acc, d) => acc + d.demurrageContainers, 0)
  );

  for (let m = 0; m < monthBuckets.length; m++) {
    const { monthLabel, startIdx, endIdx } = monthBuckets[m];
    const slice = dailySeries.slice(startIdx, endIdx);
    if (slice.length === 0) continue;

    const prevCumArrived = startIdx > 0 ? dailySeries[startIdx - 1].cumulativeArrived : 0;
    const endCumArrived = slice[slice.length - 1].cumulativeArrived;
    const modulesArrived = Math.max(0, endCumArrived - prevCumArrived);

    const modulesInstalled = slice.reduce((acc, d) => acc + d.dailyInstalled, 0);
    const avgOnHandInventory = Math.round(
      slice.reduce((acc, d) => acc + d.totalOnHand, 0) / slice.length
    );
    const avgBufferInventory = Math.round(
      slice.reduce((acc, d) => acc + d.bufferInventory, 0) / slice.length
    );
    const avgPipelineWIP = Math.round(
      slice.reduce((acc, d) => acc + d.pipelineModules, 0) / slice.length
    );
    const stockoutModules = slice.reduce((acc, d) => acc + d.stockoutModules, 0);
    const demurrageContainerDays = Number(
      slice.reduce((acc, d) => acc + d.demurrageContainers, 0).toFixed(1)
    );

    const arrivalShare = modulesArrived / totalArrivedAll;
    const installShare = modulesInstalled / totalInstalledAll;
    const stockoutShare =
      totalStockoutModAll > 1 ? stockoutModules / totalStockoutModAll : 0;
    const demurrageShare =
      totalDemurrageAll > 0.1 ? demurrageContainerDays / totalDemurrageAll : 0;

    const monthlyLogisticsCostUSD = Math.round(
      (procurementAndOceanCostUSD + freightAndDrayageCostUSD + warehouseHandlingCostUSD) *
        arrivalShare +
        (warehouseLeaseCostUSD + workingCapitalCostUSD) / Math.max(1, totalMonths) +
        portDemurrageCostUSD * demurrageShare +
        idleCrewPenaltyCostUSD * (idleCrewPenaltyCostUSD > 0 ? stockoutShare : installShare * 0)
    );

    const firstDate = slice[0].compactDateLabel;
    const lastDate = slice[slice.length - 1].dateLabel;

    monthlySeries.push({
      month: m + 1,
      monthLabel,
      dayRangeLabel: `${firstDate} – ${lastDate}`,
      modulesArrived,
      modulesInstalled,
      avgOnHandInventory,
      avgBufferInventory,
      avgPipelineWIP,
      stockoutModules,
      demurrageContainerDays,
      monthlyLogisticsCostUSD,
    });
  }

  // Normalize container counts if shipments slightly differed from totalProjectContainers
  void totalProjectContainers;

  return {
    strategyId,
    strategyLabel: meta[strategyId].label,
    description: meta[strategyId].desc,
    dailySeries,
    monthlySeries,
    avgStockoutDays,
    p90StockoutDays,
    installationContinuityPct: Number((sumContinuityPct / runs).toFixed(1)),
    avgProjectCompletionDay: avgCompletionDay,
    scheduleSlipDays,
    avgDemurrageContainerDays: avgDemurrageContDays,
    peakWarehouseModules,
    avgBufferModules,
    procurementAndOceanCostUSD,
    freightAndDrayageCostUSD,
    warehouseLeaseCostUSD,
    warehouseHandlingCostUSD,
    workingCapitalCostUSD,
    portDemurrageCostUSD,
    idleCrewPenaltyCostUSD,
    totalLogisticsCostUSD,
    totalAllInCostUSD,
    logisticsCostPerWpUSD,
  };
}

export function runSupplyChainSimulation(input: SupplyChainModelInput): SimulationOutput {
  const runs = Math.min(400, Math.max(40, input.params.monteCarloRuns));
  const bufferMetrics = computeBufferMetrics(input, 1);

  const { realizations, stageAttribution, sampleBottlenecks } =
    generateMonteCarloRealizations(input, runs, 1);

  const direct = evaluateStrategy('direct', input, bufferMetrics, realizations);
  const warehouse = evaluateStrategy('warehouse', input, bufferMetrics, realizations);
  const hybrid = evaluateStrategy('hybrid', input, bufferMetrics, realizations);

  const strategies: Record<StrategyId, StrategySimulationResult> = {
    direct,
    warehouse,
    hybrid,
  };

  // Volatility sensitivity sweep (0.4x to 2.0x) using lightweight 60-run batches for fast curve
  const multipliers = [0.4, 0.7, 1.0, 1.3, 1.6, 2.0];
  const sensitivityRuns = Math.min(75, runs);
  const sensitivityCurve: SensitivityPoint[] = multipliers.map((mult) => {
    const bm = computeBufferMetrics(input, mult);
    const { realizations: sensReal } = generateMonteCarloRealizations(
      input,
      sensitivityRuns,
      mult
    );
    const dRes = evaluateStrategy('direct', input, bm, sensReal);
    const wRes = evaluateStrategy('warehouse', input, bm, sensReal);
    const hRes = evaluateStrategy('hybrid', input, bm, sensReal);

    return {
      volatilityMultiplier: mult,
      label: `${mult.toFixed(1)}x`,
      directTotalLogisticsUSD: dRes.totalLogisticsCostUSD,
      warehouseTotalLogisticsUSD: wRes.totalLogisticsCostUSD,
      hybridTotalLogisticsUSD: hRes.totalLogisticsCostUSD,
      directStockoutDays: dRes.avgStockoutDays,
      warehouseStockoutDays: wRes.avgStockoutDays,
    };
  });

  // Estimate break-even volatility multiplier where Warehouse < Direct
  let breakEvenVolatilityMultiplier: number | null = null;
  for (let i = 0; i < sensitivityCurve.length - 1; i++) {
    const a = sensitivityCurve[i];
    const b = sensitivityCurve[i + 1];
    const diffA = a.warehouseTotalLogisticsUSD - a.directTotalLogisticsUSD;
    const diffB = b.warehouseTotalLogisticsUSD - b.directTotalLogisticsUSD;
    if (diffA >= 0 && diffB <= 0) {
      const t = diffA / Math.max(1, diffA - diffB);
      breakEvenVolatilityMultiplier = Number(
        (
          a.volatilityMultiplier +
          t * (b.volatilityMultiplier - a.volatilityMultiplier)
        ).toFixed(2)
      );
      break;
    }
  }
  if (
    breakEvenVolatilityMultiplier === null &&
    sensitivityCurve[0].warehouseTotalLogisticsUSD <
      sensitivityCurve[0].directTotalLogisticsUSD
  ) {
    breakEvenVolatilityMultiplier = 0.4;
  }

  const ranked = [direct, warehouse, hybrid].sort(
    (a, b) => a.totalLogisticsCostUSD - b.totalLogisticsCostUSD
  );
  const recommendedStrategy = ranked[0].strategyId;
  const maxSavingsUSD = ranked[ranked.length - 1].totalLogisticsCostUSD - ranked[0].totalLogisticsCostUSD;

  return {
    bufferMetrics,
    strategies,
    stageAttribution,
    sampleBottlenecks,
    sensitivityCurve,
    recommendedStrategy,
    maxSavingsUSD,
    breakEvenVolatilityMultiplier,
  };
}
