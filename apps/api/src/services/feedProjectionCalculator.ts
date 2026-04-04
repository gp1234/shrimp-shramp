import type { PondDayProjection } from '@shrampi/types';

// ============================================
// Day labels (Spanish) indexed by dayIndex
// ============================================

const DAY_LABELS: Record<number, string> = {
  0: 'VIERNES',
  1: 'SABADO',
  2: 'DOMINGO',
  3: 'LUNES',
  4: 'MARTES',
  5: 'MIERCOLES',
  6: 'JUEVES',
  7: 'VIERNES',
};

// ============================================
// Supplier table entry for BW% lookup
// ============================================

export interface SupplierTableEntry {
  weightGrams: number;
  bwPercent: number;
}

// ============================================
// Pure calculation functions
// ============================================

/** Weekly growth rate divided by 7 */
export function calculateDailyGrowth(weeklyGrowth: number): number {
  return weeklyGrowth / 7;
}

/** Previous weight + daily growth, rounded to 2 decimals */
export function projectWeight(prevWeight: number, dailyGrowth: number): number {
  return Math.round((prevWeight + dailyGrowth) * 100) / 100;
}

/**
 * Find closest weight in supplier table and interpolate linearly.
 * If weight is below the minimum entry, use the first entry's bwPercent.
 * If weight is above the maximum entry, use the last entry's bwPercent.
 */
export function lookupBWPercent(
  weight: number,
  supplierTable: SupplierTableEntry[],
): number {
  if (supplierTable.length === 0) return 0;

  const sorted = [...supplierTable].sort((a, b) => a.weightGrams - b.weightGrams);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  if (weight <= first.weightGrams) return first.bwPercent;
  if (weight >= last.weightGrams) return last.bwPercent;

  // Find the two entries that bracket the weight
  for (let i = 0; i < sorted.length - 1; i++) {
    const low = sorted[i]!;
    const high = sorted[i + 1]!;
    if (weight >= low.weightGrams && weight <= high.weightGrams) {
      const ratio = (weight - low.weightGrams) / (high.weightGrams - low.weightGrams);
      return Math.round((low.bwPercent + ratio * (high.bwPercent - low.bwPercent)) * 10000) / 10000;
    }
  }

  return last.bwPercent;
}

/** weightG × densityPerM2 × hectares × 10000 / 454 */
export function calculateBiomassLbs(
  weightG: number,
  densityPerM2: number,
  hectares: number,
): number {
  return Math.round(weightG * densityPerM2 * hectares * 10000 / 454);
}

/** weightG × densityPerM2 × hectares × 10 */
export function calculateBiomassKg(
  weightG: number,
  densityPerM2: number,
  hectares: number,
): number {
  return Math.round(weightG * densityPerM2 * hectares * 10 * 100) / 100;
}

/** biomassKg × bwPercent / 100, rounded to nearest 25 */
export function calculateFeedQuantity(biomassKg: number, bwPercent: number): number {
  const raw = biomassKg * bwPercent / 100;
  return Math.round(raw / 25) * 25;
}

/** feedQtyLbs / hectares, rounded */
export function calculateKHD(feedQtyLbs: number, hectares: number): number {
  return Math.round(feedQtyLbs / hectares);
}

// ============================================
// Week projection generator
// ============================================

export interface GenerateWeekInput {
  pondId: string;
  pondName: string;
  weight: number;
  density: number;
  hectares: number;
  weeklyGrowth: number;
  supplierTable: SupplierTableEntry[];
  weekStartDate: string; // ISO date string (the Friday)
  feedType?: string;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

function buildDay(
  input: {
    pondId: string;
    pondName: string;
    dayDate: string;
    dayIndex: number;
    isRealData: boolean;
    hectares: number;
    weight: number;
    density: number;
    supplierTable: SupplierTableEntry[];
    feedType?: string;
  },
): PondDayProjection {
  const bwPercent = lookupBWPercent(input.weight, input.supplierTable);
  const biomassLbs = calculateBiomassLbs(input.weight, input.density, input.hectares);
  const biomassKg = calculateBiomassKg(input.weight, input.density, input.hectares);
  const feedQuantityLbs = calculateFeedQuantity(biomassKg, bwPercent);
  const khdFeed = calculateKHD(feedQuantityLbs, input.hectares);

  return {
    pondId: input.pondId,
    pondName: input.pondName,
    dayDate: input.dayDate,
    dayIndex: input.dayIndex,
    dayLabel: DAY_LABELS[input.dayIndex] ?? '',
    isRealData: input.isRealData,
    hectares: input.hectares,
    weight: input.weight,
    density: input.density,
    biomassLbs,
    biomassKg,
    bwPercent,
    feedQuantityLbs,
    khdFeed,
    feedType: input.feedType,
  };
}

/**
 * Generates 8 PondDayProjection objects (day 0=Friday through day 7=next Friday).
 * Day 0 uses input weight. Days 1-3 project forward. Day 4 is Tuesday placeholder.
 * Days 5-7 project from day 4 (or day 3 if no real data yet).
 *
 * Verification:
 * Ps1: weight=5.10, dens=25.35, HA=7.18, weeklyGrowth=2.75
 *   dailyGrowth=0.3929, biomassLbs=20,446, feedQty=575, KHD=80 ✓
 * Ps7: weight=13.00, dens=36.0, HA=7.25
 *   feedQty=1,400, KHD=193 ✓
 */
export function generateWeekProjection(input: GenerateWeekInput): PondDayProjection[] {
  const dailyGrowth = calculateDailyGrowth(input.weeklyGrowth);
  const days: PondDayProjection[] = [];

  // Day 0 (Friday) — uses input weight directly
  let currentWeight = input.weight;
  days.push(
    buildDay({
      pondId: input.pondId,
      pondName: input.pondName,
      dayDate: input.weekStartDate,
      dayIndex: 0,
      isRealData: false,
      hectares: input.hectares,
      weight: currentWeight,
      density: input.density,
      supplierTable: input.supplierTable,
      feedType: input.feedType,
    }),
  );

  // Days 1-3 (Sat, Sun, Mon) — project from day 0
  for (let i = 1; i <= 3; i++) {
    currentWeight = projectWeight(currentWeight, dailyGrowth);
    days.push(
      buildDay({
        pondId: input.pondId,
        pondName: input.pondName,
        dayDate: addDays(input.weekStartDate, i),
        dayIndex: i,
        isRealData: false,
        hectares: input.hectares,
        weight: currentWeight,
        density: input.density,
        supplierTable: input.supplierTable,
        feedType: input.feedType,
      }),
    );
  }

  // Day 4 (Tuesday) — placeholder for real data, project from day 3 for now
  currentWeight = projectWeight(currentWeight, dailyGrowth);
  days.push(
    buildDay({
      pondId: input.pondId,
      pondName: input.pondName,
      dayDate: addDays(input.weekStartDate, 4),
      dayIndex: 4,
      isRealData: false,
      hectares: input.hectares,
      weight: currentWeight,
      density: input.density,
      supplierTable: input.supplierTable,
      feedType: input.feedType,
    }),
  );

  // Days 5-7 (Wed, Thu, next Fri) — project from day 4
  for (let i = 5; i <= 7; i++) {
    currentWeight = projectWeight(currentWeight, dailyGrowth);
    days.push(
      buildDay({
        pondId: input.pondId,
        pondName: input.pondName,
        dayDate: addDays(input.weekStartDate, i),
        dayIndex: i,
        isRealData: false,
        hectares: input.hectares,
        weight: currentWeight,
        density: input.density,
        supplierTable: input.supplierTable,
        feedType: input.feedType,
      }),
    );
  }

  return days;
}

// ============================================
// Recalculate from real data
// ============================================

/**
 * When real sampling data comes in (Tuesday or Friday):
 * 1. Stores old projected weight as weightProjected
 * 2. Calculates deviation: (realWeight - projected) / projected × 100
 * 3. Recalculates all days after realDayIndex using the new real weight
 *
 * Verification:
 * Ps1: weight=5.10, dens=25.35, HA=7.18, weeklyGrowth=2.75
 *   dailyGrowth=0.3929, biomassLbs=20,446, feedQty=575, KHD=80 ✓
 * Ps7: weight=13.00, dens=36.0, HA=7.25
 *   feedQty=1,400, KHD=193 ✓
 */
export function recalculateFromRealData(
  existingDays: PondDayProjection[],
  realDayIndex: number,
  realWeight: number,
  supplierTable: SupplierTableEntry[],
  newDensity?: number,
): PondDayProjection[] {
  const sorted = [...existingDays].sort((a, b) => a.dayIndex - b.dayIndex);
  if (sorted.length === 0) return sorted;

  // Compute daily growth from the first two days
  const dailyGrowth =
    sorted.length >= 2 ? sorted[1]!.weight - sorted[0]!.weight : 0;

  const result: PondDayProjection[] = [];

  for (const day of sorted) {
    if (day.dayIndex < realDayIndex) {
      // Days before real data — unchanged
      result.push(day);
    } else if (day.dayIndex === realDayIndex) {
      // The real-data day
      const oldProjectedWeight = day.weight;
      const deviation =
        oldProjectedWeight !== 0
          ? Math.round(((realWeight - oldProjectedWeight) / oldProjectedWeight) * 10000) / 100
          : undefined;

      const density = newDensity ?? day.density;
      const bwPercent = lookupBWPercent(realWeight, supplierTable);
      const biomassLbs = calculateBiomassLbs(realWeight, density, day.hectares);
      const biomassKg = calculateBiomassKg(realWeight, density, day.hectares);
      const feedQuantityLbs = calculateFeedQuantity(biomassKg, bwPercent);
      const khdFeed = calculateKHD(feedQuantityLbs, day.hectares);

      result.push({
        ...day,
        isRealData: true,
        weight: realWeight,
        weightProjected: oldProjectedWeight,
        weightDeviation: deviation,
        density,
        bwPercent,
        biomassLbs,
        biomassKg,
        feedQuantityLbs,
        khdFeed,
      });
    } else {
      // Days after real data — recalculate from new baseline
      const prevDay = result[result.length - 1]!;
      const newWeight = projectWeight(prevDay.weight, dailyGrowth);
      const density = newDensity ?? day.density;
      const bwPercent = lookupBWPercent(newWeight, supplierTable);
      const biomassLbs = calculateBiomassLbs(newWeight, density, day.hectares);
      const biomassKg = calculateBiomassKg(newWeight, density, day.hectares);
      const feedQuantityLbs = calculateFeedQuantity(biomassKg, bwPercent);
      const khdFeed = calculateKHD(feedQuantityLbs, day.hectares);

      result.push({
        ...day,
        isRealData: false,
        weight: newWeight,
        weightProjected: undefined,
        weightDeviation: undefined,
        density,
        bwPercent,
        biomassLbs,
        biomassKg,
        feedQuantityLbs,
        khdFeed,
      });
    }
  }

  return result;
}
