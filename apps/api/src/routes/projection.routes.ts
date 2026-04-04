import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import {
  generateWeekProjection,
  recalculateFromRealData,
  calculateDailyGrowth,
  type SupplierTableEntry,
} from "../services/feedProjectionCalculator";
import { generateWeeklyAnalysis } from "../services/alertEngine";
import type {
  PondDayProjection,
  WeeklyProjectionResponse,
  PondWeeklySummary,
} from "@shrampi/types";

export const projectionRouter = Router();
projectionRouter.use(authenticate);

// ============================================
// Reference Data
// ============================================

// GET /api/v1/projection/suppliers — list supplier names for current farm
projectionRouter.get(
  "/suppliers",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId } = req.query;
      if (!farmId) {
        res.status(400).json({ success: false, error: "farmId is required" });
        return;
      }

      const suppliers = await prisma.feedSupplierTable.findMany({
        where: { farmId: farmId as string },
        select: { supplierName: true },
        distinct: ["supplierName"],
        orderBy: { supplierName: "asc" },
      });

      res.json({
        success: true,
        data: suppliers.map((s) => s.supplierName),
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch suppliers" });
    }
  },
);

// GET /api/v1/projection/suppliers/:name/table — full %BW table
projectionRouter.get(
  "/suppliers/:name/table",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId } = req.query;
      if (!farmId) {
        res.status(400).json({ success: false, error: "farmId is required" });
        return;
      }

      const table = await prisma.feedSupplierTable.findMany({
        where: {
          farmId: farmId as string,
          supplierName: req.params.name as string,
        },
        select: { weightGrams: true, bwPercent: true },
        orderBy: { weightGrams: "asc" },
      });

      res.json({ success: true, data: table });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch supplier table" });
    }
  },
);

// POST /api/v1/projection/suppliers/seed — upsert supplier table
projectionRouter.post(
  "/suppliers/seed",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId, supplierName, entries } = req.body;
      if (!farmId || !supplierName || !entries?.length) {
        res.status(400).json({
          success: false,
          error: "farmId, supplierName, and entries are required",
        });
        return;
      }

      const operations = entries.map(
        (e: { weightGrams: number; bwPercent: number }) =>
          prisma.feedSupplierTable.upsert({
            where: {
              farmId_supplierName_weightGrams: {
                farmId,
                supplierName,
                weightGrams: e.weightGrams,
              },
            },
            create: {
              farmId,
              supplierName,
              weightGrams: e.weightGrams,
              bwPercent: e.bwPercent,
            },
            update: {
              bwPercent: e.bwPercent,
            },
          }),
      );

      await prisma.$transaction(operations);

      res.json({
        success: true,
        message: `Upserted ${entries.length} entries for ${supplierName}`,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to seed supplier table" });
    }
  },
);

// GET /api/v1/projection/fca-reference — FCA reference table
projectionRouter.get(
  "/fca-reference",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId } = req.query;
      if (!farmId) {
        res.status(400).json({ success: false, error: "farmId is required" });
        return;
      }

      const data = await prisma.fCAReference.findMany({
        where: { farmId: farmId as string },
        orderBy: { weightFrom: "asc" },
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch FCA reference" });
    }
  },
);

// ============================================
// Projection CRUD
// ============================================

// POST /api/v1/projection/weekly — create projection
projectionRouter.post(
  "/weekly",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { weekStartDate, supplierName, pondIds, farmId } = req.body;
      if (!weekStartDate || !supplierName || !pondIds?.length || !farmId) {
        res.status(400).json({
          success: false,
          error:
            "farmId, weekStartDate, supplierName, and pondIds are required",
        });
        return;
      }

      const startDate = new Date(weekStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      // Fetch supplier table
      const supplierTable = await prisma.feedSupplierTable.findMany({
        where: { farmId, supplierName },
        select: { weightGrams: true, bwPercent: true },
        orderBy: { weightGrams: "asc" },
      });

      if (supplierTable.length === 0) {
        res.status(400).json({
          success: false,
          error: `No supplier table found for "${supplierName}" in this farm`,
        });
        return;
      }

      // Fetch FCA reference for the farm
      const fcaRefs = await prisma.fCAReference.findMany({
        where: { farmId },
        orderBy: { weightFrom: "asc" },
      });

      // Fetch ponds with latest sampling data
      const ponds = await prisma.pond.findMany({
        where: { id: { in: pondIds }, farmId },
        select: { id: true, name: true, area: true },
      });

      if (ponds.length === 0) {
        res.status(400).json({
          success: false,
          error: "No matching ponds found in this farm",
        });
        return;
      }

      // Create the weekly projection record
      const projection = await prisma.weeklyFeedProjection.create({
        data: {
          farmId,
          weekStartDate: startDate,
          weekEndDate: endDate,
          supplierName,
          createdById: req.user!.userId,
        },
      });

      // Generate projections for each pond
      const pondSummaries: PondWeeklySummary[] = [];
      const allPondDayRecords: Array<{
        weeklyFeedProjectionId: string;
        pondId: string;
        dayDate: Date;
        dayIndex: number;
        isRealData: boolean;
        hectares: number;
        weeklyGrowthRate: number | null;
        dailyGrowthRate: number | null;
        weight: number;
        density: number;
        biomassLbs: number | null;
        biomassKg: number | null;
        bwPercent: number | null;
        feedQuantityLbs: number | null;
        khdFeed: number | null;
        feedType: string | null;
      }> = [];

      for (const pond of ponds) {
        // Get latest population sampling for this pond
        const latestSampling = await prisma.populationSampling.findFirst({
          where: { pondId: pond.id, farmId },
          orderBy: { samplingDate: "desc" },
        });

        // Get latest preweight for growth rate
        const latestPreweight = await prisma.preweightPondEntry.findFirst({
          where: { pondId: pond.id },
          orderBy: { createdAt: "desc" },
        });

        const weight = latestSampling?.averageWeight ?? 1;
        const density = latestSampling?.shrimpPerSqMeter ?? 0;
        const weeklyGrowth = latestPreweight?.growthRate ?? 0;
        const hectares = pond.area;

        // Find matching FCA reference
        const fcaRef = fcaRefs.find(
          (f) => weight >= f.weightFrom && weight < f.weightTo,
        );

        const days = generateWeekProjection({
          pondId: pond.id,
          pondName: pond.name,
          weight,
          density,
          hectares,
          weeklyGrowth,
          supplierTable,
          weekStartDate: weekStartDate as string,
          feedType: undefined,
        });

        const totalFeedLbs = days.reduce(
          (sum, d) => sum + d.feedQuantityLbs,
          0,
        );
        const totalFeedKg = Math.round(totalFeedLbs * 0.4536 * 100) / 100;
        const dailyGrowthRate = calculateDailyGrowth(weeklyGrowth);

        pondSummaries.push({
          pondId: pond.id,
          pondName: pond.name,
          hectares,
          weeklyGrowthRate: weeklyGrowth,
          dailyGrowthRate,
          expectedWeeklyGrowth: fcaRef?.expectedWeeklyGrowth ?? 0,
          expectedFCA: fcaRef?.expectedFCA ?? 0,
          days,
          totalFeedLbs,
          totalFeedKg,
        });

        // Prepare DB records
        for (const day of days) {
          allPondDayRecords.push({
            weeklyFeedProjectionId: projection.id,
            pondId: pond.id,
            dayDate: new Date(day.dayDate),
            dayIndex: day.dayIndex,
            isRealData: day.isRealData,
            hectares: day.hectares,
            weeklyGrowthRate: weeklyGrowth,
            dailyGrowthRate,
            weight: day.weight,
            density: day.density,
            biomassLbs: day.biomassLbs,
            biomassKg: day.biomassKg,
            bwPercent: day.bwPercent,
            feedQuantityLbs: day.feedQuantityLbs,
            khdFeed: day.khdFeed,
            feedType: day.feedType ?? null,
          });
        }
      }

      // Bulk insert pond day records
      await prisma.feedProjectionPondDay.createMany({
        data: allPondDayRecords,
      });

      // Update total weekly feed
      const totalWeeklyFeedKg = pondSummaries.reduce(
        (sum, p) => sum + p.totalFeedKg,
        0,
      );
      await prisma.weeklyFeedProjection.update({
        where: { id: projection.id },
        data: { totalWeeklyFeedKg },
      });

      const response: WeeklyProjectionResponse = {
        id: projection.id,
        weekStartDate: startDate.toISOString(),
        weekEndDate: endDate.toISOString(),
        status: projection.status,
        supplierName,
        totalWeeklyFeedKg,
        ponds: pondSummaries,
      };

      res.status(201).json({ success: true, data: response });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create projection" });
    }
  },
);

// GET /api/v1/projection/weekly — list projections
projectionRouter.get(
  "/weekly",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        farmId,
        status,
        page = "1",
        limit = "20",
      } = req.query;

      if (!farmId) {
        res.status(400).json({ success: false, error: "farmId is required" });
        return;
      }

      const where: any = { farmId: farmId as string };
      if (status) where.status = status as string;

      const pageNum = Math.max(1, parseInt(page as string));
      const pageSize = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * pageSize;

      const [total, data] = await Promise.all([
        prisma.weeklyFeedProjection.count({ where }),
        prisma.weeklyFeedProjection.findMany({
          where,
          orderBy: { weekStartDate: "desc" },
          skip,
          take: pageSize,
          include: {
            createdBy: { select: { name: true } },
          },
        }),
      ]);

      res.json({
        success: true,
        data,
        pagination: {
          page: pageNum,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch projections" });
    }
  },
);

// GET /api/v1/projection/weekly/:id — full detail
projectionRouter.get(
  "/weekly/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projection = await prisma.weeklyFeedProjection.findUnique({
        where: { id: req.params.id as string },
        include: {
          createdBy: { select: { name: true } },
        },
      });

      if (!projection) {
        res
          .status(404)
          .json({ success: false, error: "Projection not found" });
        return;
      }

      // Fetch all pond days grouped by pond
      const pondDays = await prisma.feedProjectionPondDay.findMany({
        where: { weeklyFeedProjectionId: projection.id },
        orderBy: [{ pondId: "asc" }, { dayIndex: "asc" }],
        include: {
          pond: { select: { name: true } },
        },
      });

      // Fetch FCA references
      const fcaRefs = await prisma.fCAReference.findMany({
        where: { farmId: projection.farmId },
        orderBy: { weightFrom: "asc" },
      });

      // Group by pond
      const pondMap = new Map<string, PondDayProjection[]>();
      const pondNames = new Map<string, string>();
      for (const pd of pondDays) {
        if (!pondMap.has(pd.pondId)) {
          pondMap.set(pd.pondId, []);
          pondNames.set(pd.pondId, pd.pond.name);
        }
        pondMap.get(pd.pondId)!.push({
          pondId: pd.pondId,
          pondName: pd.pond.name,
          dayDate: pd.dayDate.toISOString().split("T")[0]!,
          dayIndex: pd.dayIndex,
          dayLabel: DAY_LABELS[pd.dayIndex] ?? "",
          isRealData: pd.isRealData,
          hectares: pd.hectares,
          weight: pd.weight,
          weightProjected: pd.weightProjected ?? undefined,
          weightDeviation: pd.weightDeviation ?? undefined,
          density: pd.density,
          biomassLbs: pd.biomassLbs ?? 0,
          biomassKg: pd.biomassKg ?? 0,
          bwPercent: pd.bwPercent ?? 0,
          feedQuantityLbs: pd.feedQuantityLbs ?? 0,
          feedQuantityOverride: pd.feedQuantityOverride ?? undefined,
          khdFeed: pd.khdFeed ?? 0,
          feedType: pd.feedType ?? undefined,
        });
      }

      const pondSummaries: PondWeeklySummary[] = [];
      for (const [pondId, days] of pondMap) {
        const firstDay = days[0]!;
        const weeklyGrowthRate =
          pondDays.find((d) => d.pondId === pondId)?.weeklyGrowthRate ?? 0;
        const dailyGrowthRate = calculateDailyGrowth(weeklyGrowthRate);
        const fcaRef = fcaRefs.find(
          (f) =>
            firstDay.weight >= f.weightFrom && firstDay.weight < f.weightTo,
        );
        const totalFeedLbs = days.reduce(
          (sum, d) => sum + d.feedQuantityLbs,
          0,
        );

        pondSummaries.push({
          pondId,
          pondName: pondNames.get(pondId) ?? "",
          hectares: firstDay.hectares,
          weeklyGrowthRate,
          dailyGrowthRate,
          expectedWeeklyGrowth: fcaRef?.expectedWeeklyGrowth ?? 0,
          expectedFCA: fcaRef?.expectedFCA ?? 0,
          days,
          totalFeedLbs,
          totalFeedKg: Math.round(totalFeedLbs * 0.4536 * 100) / 100,
        });
      }

      const response: WeeklyProjectionResponse = {
        id: projection.id,
        weekStartDate: projection.weekStartDate.toISOString(),
        weekEndDate: projection.weekEndDate.toISOString(),
        status: projection.status,
        supplierName: projection.supplierName,
        totalWeeklyFeedKg: projection.totalWeeklyFeedKg ?? 0,
        ponds: pondSummaries,
      };

      res.json({ success: true, data: response });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch projection detail" });
    }
  },
);

// PATCH /api/v1/projection/weekly/:id/real-data — update with real sampling data
projectionRouter.patch(
  "/weekly/:id/real-data",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { pondId, dayDate, weight, density, feedQuantityOverride } =
        req.body;
      if (!pondId || !dayDate || weight == null) {
        res.status(400).json({
          success: false,
          error: "pondId, dayDate, and weight are required",
        });
        return;
      }

      const projection = await prisma.weeklyFeedProjection.findUnique({
        where: { id: req.params.id as string },
      });
      if (!projection) {
        res
          .status(404)
          .json({ success: false, error: "Projection not found" });
        return;
      }

      // Fetch supplier table
      const supplierTable: SupplierTableEntry[] =
        await prisma.feedSupplierTable.findMany({
          where: {
            farmId: projection.farmId,
            supplierName: projection.supplierName,
          },
          select: { weightGrams: true, bwPercent: true },
          orderBy: { weightGrams: "asc" },
        });

      // Fetch existing pond days for this pond
      const existingDays = await prisma.feedProjectionPondDay.findMany({
        where: {
          weeklyFeedProjectionId: projection.id,
          pondId,
        },
        orderBy: { dayIndex: "asc" },
        include: { pond: { select: { name: true } } },
      });

      if (existingDays.length === 0) {
        res.status(404).json({
          success: false,
          error: "No pond days found for this pond in this projection",
        });
        return;
      }

      // Find the target day
      const targetDate = new Date(dayDate).toISOString().split("T")[0];
      const targetDay = existingDays.find(
        (d) => d.dayDate.toISOString().split("T")[0] === targetDate,
      );
      if (!targetDay) {
        res.status(404).json({
          success: false,
          error: `No projection day found for date ${dayDate}`,
        });
        return;
      }

      // Convert DB records to PondDayProjection for recalculation
      const currentDays: PondDayProjection[] = existingDays.map((d) => ({
        pondId: d.pondId,
        pondName: d.pond.name,
        dayDate: d.dayDate.toISOString().split("T")[0]!,
        dayIndex: d.dayIndex,
        dayLabel: DAY_LABELS[d.dayIndex] ?? "",
        isRealData: d.isRealData,
        hectares: d.hectares,
        weight: d.weight,
        weightProjected: d.weightProjected ?? undefined,
        weightDeviation: d.weightDeviation ?? undefined,
        density: d.density,
        biomassLbs: d.biomassLbs ?? 0,
        biomassKg: d.biomassKg ?? 0,
        bwPercent: d.bwPercent ?? 0,
        feedQuantityLbs: d.feedQuantityLbs ?? 0,
        feedQuantityOverride: d.feedQuantityOverride ?? undefined,
        khdFeed: d.khdFeed ?? 0,
        feedType: d.feedType ?? undefined,
      }));

      // Recalculate from real data
      const updatedDays = recalculateFromRealData(
        currentDays,
        targetDay.dayIndex,
        weight,
        supplierTable,
        density,
      );

      // Apply feed quantity override if provided
      if (feedQuantityOverride != null) {
        const realDay = updatedDays.find(
          (d) => d.dayIndex === targetDay.dayIndex,
        );
        if (realDay) {
          realDay.feedQuantityOverride = feedQuantityOverride;
        }
      }

      // Update all days in DB
      const updateOps = updatedDays.map((day) => {
        const dbDay = existingDays.find((d) => d.dayIndex === day.dayIndex);
        return prisma.feedProjectionPondDay.update({
          where: { id: dbDay!.id },
          data: {
            isRealData: day.isRealData,
            weight: day.weight,
            weightProjected: day.weightProjected ?? null,
            weightDeviation: day.weightDeviation ?? null,
            density: day.density,
            biomassLbs: day.biomassLbs,
            biomassKg: day.biomassKg,
            bwPercent: day.bwPercent,
            feedQuantityLbs: day.feedQuantityLbs,
            feedQuantityOverride: day.feedQuantityOverride ?? null,
            khdFeed: day.khdFeed,
          },
        });
      });
      await prisma.$transaction(updateOps);

      // Recalculate total weekly feed
      const allPondDays = await prisma.feedProjectionPondDay.findMany({
        where: { weeklyFeedProjectionId: projection.id },
      });
      const totalWeeklyFeedKg =
        Math.round(
          allPondDays.reduce(
            (sum, d) => sum + (d.feedQuantityLbs ?? 0),
            0,
          ) *
            0.4536 *
            100,
        ) / 100;

      await prisma.weeklyFeedProjection.update({
        where: { id: projection.id },
        data: { totalWeeklyFeedKg },
      });

      // Run weekly analysis for this pond
      await generateWeeklyAnalysis(projection.id, pondId);

      res.json({ success: true, data: updatedDays });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update real data" });
    }
  },
);

// PATCH /api/v1/projection/weekly/:id/status — status transition
projectionRouter.patch(
  "/weekly/:id/status",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;
      const validStatuses = ["draft", "approved", "completed"];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `status must be one of: ${validStatuses.join(", ")}`,
        });
        return;
      }

      const projection = await prisma.weeklyFeedProjection.update({
        where: { id: req.params.id as string },
        data: { status },
      });

      res.json({ success: true, data: projection });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update projection status" });
    }
  },
);

// DELETE /api/v1/projection/weekly/:id — draft only
projectionRouter.delete(
  "/weekly/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projection = await prisma.weeklyFeedProjection.findUnique({
        where: { id: req.params.id as string },
      });

      if (!projection) {
        res
          .status(404)
          .json({ success: false, error: "Projection not found" });
        return;
      }

      if (projection.status !== "draft") {
        res.status(400).json({
          success: false,
          error: "Only draft projections can be deleted",
        });
        return;
      }

      // Delete pond days first (cascade), then projection
      await prisma.$transaction([
        prisma.feedProjectionPondDay.deleteMany({
          where: { weeklyFeedProjectionId: projection.id },
        }),
        prisma.pondWeeklyAnalysis.deleteMany({
          where: { weeklyFeedProjectionId: projection.id },
        }),
        prisma.weeklyFeedProjection.delete({
          where: { id: projection.id },
        }),
      ]);

      res.json({ success: true, message: "Projection deleted" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete projection" });
    }
  },
);

// ============================================
// Analysis
// ============================================

// GET /api/v1/projection/weekly/:id/analysis — all PondWeeklyAnalysis
projectionRouter.get(
  "/weekly/:id/analysis",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const analyses = await prisma.pondWeeklyAnalysis.findMany({
        where: { weeklyFeedProjectionId: req.params.id as string },
        include: {
          pond: { select: { name: true, code: true } },
          populationSampling: {
            select: {
              averageWeight: true,
              shrimpPerSqMeter: true,
              diseasePercent: true,
            },
          },
        },
        orderBy: { pond: { name: "asc" } },
      });

      res.json({ success: true, data: analyses });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch analysis" });
    }
  },
);

// GET /api/v1/projection/analysis/pond/:pondId/history — historical analysis
projectionRouter.get(
  "/analysis/pond/:pondId/history",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = "10" } = req.query;
      const take = Math.min(52, Math.max(1, parseInt(limit as string)));

      const analyses = await prisma.pondWeeklyAnalysis.findMany({
        where: { pondId: req.params.pondId as string },
        include: {
          weeklyFeedProjection: {
            select: {
              weekStartDate: true,
              weekEndDate: true,
              supplierName: true,
            },
          },
          pond: { select: { name: true, code: true } },
        },
        orderBy: { weekDate: "desc" },
        take,
      });

      res.json({ success: true, data: analyses });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch pond history" });
    }
  },
);

// ============================================
// Day labels helper (shared with detail endpoint)
// ============================================

const DAY_LABELS: Record<number, string> = {
  0: "VIERNES",
  1: "SABADO",
  2: "DOMINGO",
  3: "LUNES",
  4: "MARTES",
  5: "MIERCOLES",
  6: "JUEVES",
  7: "VIERNES",
};
