import type { PondAnalysis } from '@shrampi/types';
import { prisma } from '@shrampi/database';
import {
  calculateBiomassKg,
  lookupBWPercent,
  type SupplierTableEntry,
} from './feedProjectionCalculator';


// ============================================
// Alert thresholds
// ============================================

const WEIGHT_DEVIATION_WARNING = 10; // ±10%
const WEIGHT_DEVIATION_CRITICAL = 20; // ±20%
const FCA_WARNING = 1.5;
const FCA_CRITICAL = 2.0;
const SURVIVAL_DROP_WARNING = 10; // >10% drop week over week
const DISEASE_PERCENT_WARNING = 3; // >3%
const BIOMASS_DISCREPANCY_WARNING = 60; // >60%

// ============================================
// Alert evaluation
// ============================================

export interface PreviousWeekData {
  survivalAtarraya?: number;
}

/**
 * Evaluates alerts for a pond based on current week metrics and optional previous week data.
 * Returns a PondAnalysis with alertLevel and alertReasons populated.
 */
export function evaluatePondAlerts(
  currentWeek: {
    pondId: string;
    pondName: string;
    weekDate: string;
    projectedWeight: number;
    actualWeight?: number;
    projectedBiomassKg?: number;
    atarrayaBiomassKg?: number;
    consumptionBiomassKg?: number;
    fcaAtarraya?: number;
    fcaConsumption?: number;
    survivalAtarraya?: number;
    survivalConsumption?: number;
    diseasePercent?: number;
  },
  previousWeek?: PreviousWeekData,
): PondAnalysis {
  const reasons: string[] = [];
  let level: 'normal' | 'warning' | 'critical' = 'normal' as const;

  function escalate(to: 'warning' | 'critical') {
    if (to === 'critical' || level === 'normal') level = to;
  }

  // Weight deviation checks
  let weightDeviationPercent: number | undefined;
  if (currentWeek.actualWeight != null && currentWeek.projectedWeight > 0) {
    weightDeviationPercent =
      ((currentWeek.actualWeight - currentWeek.projectedWeight) / currentWeek.projectedWeight) * 100;

    const absDeviation = Math.abs(weightDeviationPercent);

    if (absDeviation > WEIGHT_DEVIATION_CRITICAL) {
      escalate('critical');
      reasons.push(weightDeviationPercent > 0 ? 'weight_above_projected' : 'weight_below_projected');
    } else if (absDeviation > WEIGHT_DEVIATION_WARNING) {
      escalate('warning');
      reasons.push(weightDeviationPercent > 0 ? 'weight_above_projected' : 'weight_below_projected');
    }
  }

  // Biomass discrepancy check
  let biomassDiscrepancyPercent: number | undefined;
  if (
    currentWeek.consumptionBiomassKg != null &&
    currentWeek.atarrayaBiomassKg != null &&
    currentWeek.consumptionBiomassKg > 0
  ) {
    biomassDiscrepancyPercent =
      ((currentWeek.consumptionBiomassKg - currentWeek.atarrayaBiomassKg) /
        currentWeek.consumptionBiomassKg) *
      100;

    if (Math.abs(biomassDiscrepancyPercent) > BIOMASS_DISCREPANCY_WARNING) {
      escalate('warning');
      reasons.push('biomass_discrepancy_high');
    }
  }

  // FCA checks
  if (currentWeek.fcaConsumption != null) {
    if (currentWeek.fcaConsumption > FCA_CRITICAL) {
      escalate('critical');
      reasons.push('fca_critical');
    } else if (currentWeek.fcaConsumption > FCA_WARNING) {
      escalate('warning');
      reasons.push('fca_warning');
    }
  }

  // Survival drop check (week over week)
  if (
    currentWeek.survivalAtarraya != null &&
    previousWeek?.survivalAtarraya != null
  ) {
    const drop = previousWeek.survivalAtarraya - currentWeek.survivalAtarraya;
    if (drop > SURVIVAL_DROP_WARNING) {
      escalate('warning');
      reasons.push('survival_drop');
    }
  }

  // Disease check
  if (currentWeek.diseasePercent != null && currentWeek.diseasePercent > DISEASE_PERCENT_WARNING) {
    escalate('warning');
    reasons.push('disease_percent_high');
  }

  return {
    pondId: currentWeek.pondId,
    pondName: currentWeek.pondName,
    weekDate: currentWeek.weekDate,
    projectedWeight: currentWeek.projectedWeight,
    actualWeight: currentWeek.actualWeight,
    weightDeviationPercent,
    projectedBiomassKg: currentWeek.projectedBiomassKg,
    atarrayaBiomassKg: currentWeek.atarrayaBiomassKg,
    consumptionBiomassKg: currentWeek.consumptionBiomassKg,
    biomassDiscrepancyPercent,
    fcaAtarraya: currentWeek.fcaAtarraya,
    fcaConsumption: currentWeek.fcaConsumption,
    survivalAtarraya: currentWeek.survivalAtarraya,
    survivalConsumption: currentWeek.survivalConsumption,
    alertLevel: level,
    alertReasons: reasons,
  };
}

// ============================================
// Weekly analysis generator (DB-aware)
// ============================================

/**
 * Fetches projection data + sampling data for a pond in a given projection week,
 * calculates comparison metrics, evaluates alerts, and upserts PondWeeklyAnalysis.
 */
export async function generateWeeklyAnalysis(
  projectionId: string,
  pondId: string,
): Promise<PondAnalysis> {
  // Fetch the weekly projection with its pond days
  const projection = await prisma.weeklyFeedProjection.findUniqueOrThrow({
    where: { id: projectionId },
    include: {
      farm: true,
    },
  });

  // Fetch pond days for this projection + pond
  const pondDays = await prisma.feedProjectionPondDay.findMany({
    where: {
      weeklyFeedProjectionId: projectionId,
      pondId,
    },
    orderBy: { dayIndex: 'asc' },
  });

  // Fetch the pond info
  const pond = await prisma.pond.findUniqueOrThrow({
    where: { id: pondId },
  });

  // Find the real-data day closest to end of week (Friday day 7, or Tuesday day 4)
  const realDays = pondDays.filter((d) => d.isRealData);
  const latestRealDay = realDays.length > 0 ? realDays[realDays.length - 1] : null;

  // Get the last projected day (day 7 = next Friday)
  const lastDay = pondDays.find((d) => d.dayIndex === 7);
  const projectedWeight = lastDay?.weight ?? pondDays[pondDays.length - 1]?.weight ?? 0;

  // Look for a population sampling near this week's date range
  const sampling = await prisma.populationSampling.findFirst({
    where: {
      pondId,
      farmId: projection.farmId,
      samplingDate: {
        gte: projection.weekStartDate,
        lte: projection.weekEndDate,
      },
    },
    orderBy: { samplingDate: 'desc' },
  });

  const actualWeight = latestRealDay?.weight ?? sampling?.averageWeight ?? undefined;

  // Calculate atarraya biomass: peso × pob_atarraya × HA × 10
  let atarrayaBiomassKg: number | undefined;
  if (sampling) {
    atarrayaBiomassKg = calculateBiomassKg(
      sampling.averageWeight,
      sampling.shrimpPerSqMeter,
      sampling.hectares,
    );
  }

  // Projected biomass from the last projected day
  const projectedBiomassKg = lastDay?.biomassKg ?? undefined;

  // Consumption biomass: inverse from feed consumed (alim_dia / %BW)
  // Sum feed for the week and derive implied biomass
  let consumptionBiomassKg: number | undefined;
  const totalFeedKg = pondDays.reduce((sum, d) => sum + (d.feedQuantityLbs ?? 0), 0) * 0.4536;
  if (totalFeedKg > 0 && lastDay?.bwPercent && lastDay.bwPercent > 0) {
    consumptionBiomassKg = totalFeedKg / (lastDay.bwPercent / 100);
  }

  // Accumulated feed
  const accumulatedFeedKg = totalFeedKg > 0 ? Math.round(totalFeedKg * 100) / 100 : undefined;

  // FCA calculations
  let fcaAtarraya: number | undefined;
  let fcaConsumption: number | undefined;
  if (atarrayaBiomassKg && accumulatedFeedKg && atarrayaBiomassKg > 0) {
    fcaAtarraya = Math.round((accumulatedFeedKg / atarrayaBiomassKg) * 100) / 100;
  }
  if (consumptionBiomassKg && accumulatedFeedKg && consumptionBiomassKg > 0) {
    fcaConsumption = Math.round((accumulatedFeedKg / consumptionBiomassKg) * 100) / 100;
  }

  // Survival estimates
  let survivalAtarraya: number | undefined;
  let survivalConsumption: number | undefined;
  // These require stocking data from the cycle — look for an active cycle on this pond
  const activeCycle = await prisma.cycle.findFirst({
    where: {
      pondId,
      status: { in: ['GROWING', 'STOCKING'] },
    },
  });
  if (activeCycle?.initialStock && activeCycle.initialStock > 0) {
    if (sampling) {
      // estimated pop from atarraya = shrimpPerSqMeter × hectares × 10000
      const estimatedPop = sampling.shrimpPerSqMeter * sampling.hectares * 10000;
      survivalAtarraya = Math.round((estimatedPop / activeCycle.initialStock) * 10000) / 100;
    }
    if (consumptionBiomassKg && actualWeight && actualWeight > 0) {
      const estimatedPopConsumption = (consumptionBiomassKg * 1000) / actualWeight;
      survivalConsumption =
        Math.round((estimatedPopConsumption / activeCycle.initialStock) * 10000) / 100;
    }
  }

  // Fetch previous week's analysis for survival drop comparison
  const previousAnalysis = await prisma.pondWeeklyAnalysis.findFirst({
    where: {
      pondId,
      weeklyFeedProjection: {
        farmId: projection.farmId,
        weekStartDate: { lt: projection.weekStartDate },
      },
    },
    orderBy: { weekDate: 'desc' },
  });

  // Get disease percent from sampling if available
  const diseasePercent = sampling?.diseasePercent ?? undefined;

  // Evaluate alerts
  const analysis = evaluatePondAlerts(
    {
      pondId,
      pondName: pond.name,
      weekDate: projection.weekStartDate.toISOString(),
      projectedWeight,
      actualWeight,
      projectedBiomassKg: projectedBiomassKg ?? undefined,
      atarrayaBiomassKg,
      consumptionBiomassKg,
      fcaAtarraya,
      fcaConsumption,
      survivalAtarraya,
      survivalConsumption,
      diseasePercent,
    },
    previousAnalysis
      ? { survivalAtarraya: previousAnalysis.survivalAtarraya ?? undefined }
      : undefined,
  );

  // Upsert PondWeeklyAnalysis
  await prisma.pondWeeklyAnalysis.upsert({
    where: {
      weeklyFeedProjectionId_pondId: {
        weeklyFeedProjectionId: projectionId,
        pondId,
      },
    },
    create: {
      weeklyFeedProjectionId: projectionId,
      pondId,
      populationSamplingId: sampling?.id ?? null,
      weekDate: projection.weekStartDate,
      projectedWeight: analysis.projectedWeight,
      actualWeight: analysis.actualWeight ?? null,
      weightDeviationPercent: analysis.weightDeviationPercent ?? null,
      projectedBiomassKg: analysis.projectedBiomassKg ?? null,
      atarrayaBiomassKg: analysis.atarrayaBiomassKg ?? null,
      consumptionBiomassKg: analysis.consumptionBiomassKg ?? null,
      biomassDiscrepancyPercent: analysis.biomassDiscrepancyPercent ?? null,
      fcaAtarraya: analysis.fcaAtarraya ?? null,
      fcaConsumption: analysis.fcaConsumption ?? null,
      accumulatedFeedKg: accumulatedFeedKg ?? null,
      survivalAtarraya: analysis.survivalAtarraya ?? null,
      survivalConsumption: analysis.survivalConsumption ?? null,
      alertLevel: analysis.alertLevel,
      alertReasons: analysis.alertReasons,
    },
    update: {
      populationSamplingId: sampling?.id ?? null,
      projectedWeight: analysis.projectedWeight,
      actualWeight: analysis.actualWeight ?? null,
      weightDeviationPercent: analysis.weightDeviationPercent ?? null,
      projectedBiomassKg: analysis.projectedBiomassKg ?? null,
      atarrayaBiomassKg: analysis.atarrayaBiomassKg ?? null,
      consumptionBiomassKg: analysis.consumptionBiomassKg ?? null,
      biomassDiscrepancyPercent: analysis.biomassDiscrepancyPercent ?? null,
      fcaAtarraya: analysis.fcaAtarraya ?? null,
      fcaConsumption: analysis.fcaConsumption ?? null,
      accumulatedFeedKg: accumulatedFeedKg ?? null,
      survivalAtarraya: analysis.survivalAtarraya ?? null,
      survivalConsumption: analysis.survivalConsumption ?? null,
      alertLevel: analysis.alertLevel,
      alertReasons: analysis.alertReasons,
    },
  });

  return analysis;
}
