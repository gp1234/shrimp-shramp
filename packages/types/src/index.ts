// ============================================
// Feed Projection & Analysis Types
// ============================================

export type {
  PondDayProjection,
  PondWeeklySummary,
  WeeklyProjectionResponse,
  CreateProjectionRequest,
  UpdateRealDataRequest,
  PondAnalysis,
} from './projection';

// ============================================
// API Request / Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

// ============================================
// Auth Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
}

export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
}

// ============================================
// KPI / Dashboard Types
// ============================================

export interface DashboardKPI {
  totalPonds: number;
  activePonds: number;
  activeCycles: number;
  completedCycles: number;
  totalBiomass: number; // lbs
  averageSurvivalRate: number;
  averageFCR: number;
  totalRevenue: number;
  totalCosts: number;
  profit: number;
}

export interface CycleKPI {
  cycleId: string;
  cycleName: string;
  pondName: string;
  daysInCycle: number;
  currentWeight: number; // grams
  survivalRate: number;
  fcr: number;
  biomass: number; // lbs
  costPerLb: number;
  gainPerHaPerDay: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
}

export interface ProductionSummary {
  date: string;
  gainPerHaPerDay: number;
  averageWeight: number;
  fcr: number;
  survivalRate: number;
  biomass: number;
  revenue: number;
  profit: number;
}

// ============================================
// Enums exported as string unions
// ============================================

export type PondStatusType =
  | "ACTIVE"
  | "INACTIVE"
  | "MAINTENANCE"
  | "HARVESTING"
  | "PREPARING";
export type WaterTypeType = "FRESHWATER" | "SALTWATER" | "BRACKISH";
export type CycleStatusType =
  | "PLANNING"
  | "STOCKING"
  | "GROWING"
  | "HARVESTING"
  | "COMPLETED"
  | "CANCELLED";
export type InventoryCategoryType =
  | "FEED"
  | "CHEMICAL"
  | "EQUIPMENT"
  | "SPARE_PART"
  | "OTHER";
export type MovementTypeType = "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
export type OrderStatusType =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "RECEIVED"
  | "CANCELLED";
export type TaskStatusType =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type TaskPriorityType = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// ============================================
// Sampling & Field Forms Types
// ============================================

// --- Weekly Pre-weight (Prepeso Semanal) ---

export interface PreweightSampleInput {
  number: number;
  weight: number;
}

export interface PreweightSampleResponse extends PreweightSampleInput {
  id: string;
  preweightPondEntryId: string;
  averageWeight: number;
  createdAt: string;
}

export interface PreweightPondEntryInput {
  pondId: string;
  growthRate: number;
  mortality?: number;
  disease?: number;
  molt?: number;
  cultureDays: number;
  samples: PreweightSampleInput[];
}

export interface PreweightPondEntryResponse {
  id: string;
  weeklyPreweightId: string;
  pondId: string;
  growthRate: number;
  mortality: number;
  disease: number;
  molt: number;
  cultureDays: number;
  totalNumber: number;
  totalWeight: number;
  averageWeight: number;
  createdAt: string;
  updatedAt: string;
  pond: { name: string; code: string };
  samples: PreweightSampleResponse[];
}

export interface PreweightCreateRequest {
  farmId: string;
  samplingDate: string;
  notes?: string;
  entries: PreweightPondEntryInput[];
}

export interface PreweightResponse {
  id: string;
  farmId: string;
  samplingDate: string;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  entries: PreweightPondEntryResponse[];
}

// --- Population Sampling (Muestreo de Poblacion con Atarraya) ---

export interface PopulationSamplingCreateRequest {
  farmId: string;
  pondId: string;
  samplingDate: string;
  hectares: number;
  stockingCount: number;
  castNetCounts: number[];
  gridColumns?: number;
  entradaRows?: number;
  salidaRows?: number;
  numberOfThrows: number;
  averageWeight: number;
  waterLevel: number;
  oldMolts?: number;
  freshMolts?: number;
  diseaseCount?: number;
  observations?: string;
}

export interface PopulationSamplingResponse {
  id: string;
  farmId: string;
  pondId: string;
  samplingDate: string;
  hectares: number;
  stockingCount: number;
  castNetCounts: number[];
  gridColumns: number;
  entradaRows: number;
  salidaRows: number;
  numberOfThrows: number;
  totalCount: number;
  countPerThrow: number;
  shrimpPerSqMeter: number;
  averageWeight: number;
  waterLevel: number;
  oldMolts: number;
  oldMoltsPercent: number;
  freshMolts: number;
  freshMoltsPercent: number;
  diseaseCount: number;
  diseasePercent: number;
  observations: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  pond: { name: string; code: string };
}

// --- Daily Gate & Water Control ---

export interface DailyWaterPondEntryInput {
  pondId: string;
  gateId: string;
  gateHeightInches?: number;
  turbiditySecchiCm?: number;
  waterColor?: string;
  observations?: string;
}

export interface DailyWaterPondEntryResponse extends DailyWaterPondEntryInput {
  id: string;
  dailyWaterControlId: string;
  createdAt: string;
  updatedAt: string;
  pond: { name: string; code: string };
}

export interface DailyWaterControlCreateRequest {
  farmId: string;
  recordDate: string;
  recordTime: "AM" | "PM";
  farmSection?: string;
  entries: DailyWaterPondEntryInput[];
}

export interface DailyWaterControlResponse {
  id: string;
  farmId: string;
  recordDate: string;
  recordTime: string;
  farmSection: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  entries: DailyWaterPondEntryResponse[];
}
