// ============================================
// Feed Projection & Analysis Types
// ============================================

export interface PondDayProjection {
  pondId: string;
  pondName: string;
  dayDate: string;
  dayIndex: number; // 0=Fri, 1=Sat...7=Fri
  dayLabel: string; // "VIERNES", "SABADO", etc.
  isRealData: boolean;
  hectares: number;
  weight: number;
  weightProjected?: number;
  weightDeviation?: number;
  density: number;
  biomassLbs: number;
  biomassKg: number;
  bwPercent: number;
  feedQuantityLbs: number;
  feedQuantityOverride?: number;
  khdFeed: number;
  feedType?: string;
}

export interface PondWeeklySummary {
  pondId: string;
  pondName: string;
  hectares: number;
  weeklyGrowthRate: number;
  dailyGrowthRate: number;
  expectedWeeklyGrowth: number;
  expectedFCA: number;
  days: PondDayProjection[];
  totalFeedLbs: number;
  totalFeedKg: number;
}

export interface WeeklyProjectionResponse {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  status: string;
  supplierName: string;
  totalWeeklyFeedKg: number;
  ponds: PondWeeklySummary[];
}

export interface CreateProjectionRequest {
  weekStartDate: string;
  supplierName: string;
  pondIds: string[];
}

export interface UpdateRealDataRequest {
  pondId: string;
  dayDate: string;
  weight: number;
  density?: number;
  feedQuantityOverride?: number;
}

export interface PondAnalysis {
  pondId: string;
  pondName: string;
  weekDate: string;
  projectedWeight: number;
  actualWeight?: number;
  weightDeviationPercent?: number;
  projectedBiomassKg?: number;
  atarrayaBiomassKg?: number;
  consumptionBiomassKg?: number;
  biomassDiscrepancyPercent?: number;
  fcaAtarraya?: number;
  fcaConsumption?: number;
  survivalAtarraya?: number;
  survivalConsumption?: number;
  alertLevel: 'normal' | 'warning' | 'critical';
  alertReasons: string[];
}
