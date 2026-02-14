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
