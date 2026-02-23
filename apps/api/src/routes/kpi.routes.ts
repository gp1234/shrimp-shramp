import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const kpiRouter = Router();
kpiRouter.use(authenticate);

// GET /api/v1/kpi/dashboard
kpiRouter.get(
  "/dashboard",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId } = req.query;
      const pondWhere: any = farmId ? { farmId } : {};
      const cycleWhere: any = farmId ? { pond: { farmId } } : {};

      // Pond counts
      const [totalPonds, activePonds] = await Promise.all([
        prisma.pond.count({ where: pondWhere }),
        prisma.pond.count({ where: { ...pondWhere, status: "ACTIVE" } }),
      ]);

      // Cycle counts
      const [activeCycles, completedCycles] = await Promise.all([
        prisma.cycle.count({
          where: { ...cycleWhere, status: { in: ["GROWING", "STOCKING"] } },
        }),
        prisma.cycle.count({ where: { ...cycleWhere, status: "COMPLETED" } }),
      ]);

      // Harvest summaries for completed cycles
      const harvests = await prisma.harvestRecord.aggregate({
        where: farmId ? { cycle: { pond: { farmId: farmId as string } } } : {},
        _sum: { totalWeight: true, totalRevenue: true },
        _avg: { survivalRate: true, averageWeight: true },
      });

      // Total costs
      const productionCostSum = await prisma.productionCost.aggregate({
        where: farmId ? { cycle: { pond: { farmId: farmId as string } } } : {},
        _sum: { amount: true },
      });
      const operationalCostSum = await prisma.operationalCost.aggregate({
        where: farmId ? { farmId: farmId as string } : {},
        _sum: { amount: true },
      });

      // Total revenue
      const revenueSum = await prisma.revenueRecord.aggregate({
        where: farmId ? { cycle: { pond: { farmId: farmId as string } } } : {},
        _sum: { amount: true },
      });

      // FCR calculation for completed cycles
      const completedCycleIds = await prisma.cycle.findMany({
        where: { ...cycleWhere, status: "COMPLETED" },
        select: { id: true },
      });
      const feedTotal = await prisma.feedingLog.aggregate({
        where: { cycleId: { in: completedCycleIds.map((c) => c.id) } },
        _sum: { quantity: true },
      });
      const totalBiomass = harvests._sum.totalWeight || 0;
      const avgFCR =
        totalBiomass > 0 ? (feedTotal._sum.quantity || 0) / totalBiomass : 0;

      const totalCosts =
        (productionCostSum._sum.amount || 0) +
        (operationalCostSum._sum.amount || 0);
      const totalRevenue = revenueSum._sum.amount || 0;

      const dashboard = {
        totalPonds,
        activePonds,
        activeCycles,
        completedCycles,
        totalBiomass: Math.round(totalBiomass * 100) / 100,
        averageSurvivalRate:
          Math.round((harvests._avg.survivalRate || 0) * 100) / 100,
        averageFCR: Math.round(avgFCR * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCosts: Math.round(totalCosts * 100) / 100,
        profit: Math.round((totalRevenue - totalCosts) * 100) / 100,
      };

      res.json({ success: true, data: dashboard });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to compute dashboard KPIs" });
    }
  },
);

// GET /api/v1/kpi/cycle/:id
kpiRouter.get(
  "/cycle/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cycle = await prisma.cycle.findUnique({
        where: { id: req.params.id },
        include: {
          pond: true,
          stockingRecords: true,
          harvestRecords: true,
          mortalityRecords: true,
          feedingLogs: true,
          productionCosts: true,
          revenueRecords: true,
        },
      });

      if (!cycle) {
        res.status(404).json({ success: false, error: "Cycle not found" });
        return;
      }

      const totalStocked = cycle.stockingRecords.reduce(
        (sum, r) => sum + r.quantity,
        0,
      );
      const totalMortality = cycle.mortalityRecords.reduce(
        (sum, r) => sum + r.count,
        0,
      );
      const totalHarvested = cycle.harvestRecords.reduce(
        (sum, r) => sum + r.totalWeight,
        0,
      );
      const totalFeed = cycle.feedingLogs.reduce(
        (sum, r) => sum + r.quantity,
        0,
      );
      const totalRevenue = cycle.revenueRecords.reduce(
        (sum, r) => sum + r.amount,
        0,
      );
      const totalCost = cycle.productionCosts.reduce(
        (sum, r) => sum + r.amount,
        0,
      );

      const survivalRate =
        totalStocked > 0
          ? ((totalStocked - totalMortality) / totalStocked) * 100
          : 0;
      const fcr = totalHarvested > 0 ? totalFeed / totalHarvested : 0;
      const costPerLb = totalHarvested > 0 ? totalCost / totalHarvested : 0;

      const startDate = cycle.startDate
        ? new Date(cycle.startDate)
        : new Date();
      const endDate = cycle.actualEndDate
        ? new Date(cycle.actualEndDate)
        : new Date();
      const daysInCycle = Math.max(
        1,
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      const biomassLbsPerHa =
        cycle.pond.area > 0 ? totalHarvested / cycle.pond.area : 0;
      const gainPerHaPerDay =
        daysInCycle > 0
          ? (totalRevenue - totalCost) / cycle.pond.area / daysInCycle
          : 0;

      const lastHarvest = cycle.harvestRecords[cycle.harvestRecords.length - 1];

      const kpi = {
        cycleId: cycle.id,
        cycleName: cycle.name,
        pondName: cycle.pond.name,
        pondArea: cycle.pond.area,
        daysInCycle,
        currentWeight: lastHarvest?.averageWeight || cycle.targetWeight || 0,
        survivalRate: Math.round(survivalRate * 100) / 100,
        fcr: Math.round(fcr * 100) / 100,
        biomass: Math.round(totalHarvested * 100) / 100,
        biomassPerHa: Math.round(biomassLbsPerHa * 100) / 100,
        costPerLb: Math.round(costPerLb * 100) / 100,
        gainPerHaPerDay: Math.round(gainPerHaPerDay * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        profit: Math.round((totalRevenue - totalCost) * 100) / 100,
      };

      res.json({ success: true, data: kpi });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to compute cycle KPIs" });
    }
  },
);

// GET /api/v1/kpi/ponds-overview
kpiRouter.get(
  "/ponds-overview",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId } = req.query;
      const ponds = await prisma.pond.findMany({
        where: farmId ? { farmId: farmId as string } : {},
        include: {
          cycles: {
            where: { status: { in: ["GROWING", "STOCKING"] } },
            take: 1,
            orderBy: { startDate: "desc" },
            include: {
              mortalityRecords: true,
              feedingLogs: true,
              stockingRecords: true,
            },
          },
          waterQualityLogs: { take: 1, orderBy: { date: "desc" } },
        },
        orderBy: { code: "asc" },
      });

      const overview = ponds.map((pond) => {
        const activeCycle = pond.cycles[0];
        const lastWQ = pond.waterQualityLogs[0];

        let survivalRate = 0;
        let daysInCycle = 0;
        if (activeCycle) {
          const totalStocked = activeCycle.stockingRecords.reduce(
            (s, r) => s + r.quantity,
            0,
          );
          const totalMortality = activeCycle.mortalityRecords.reduce(
            (s, r) => s + r.count,
            0,
          );
          survivalRate =
            totalStocked > 0
              ? ((totalStocked - totalMortality) / totalStocked) * 100
              : 0;
          const start = activeCycle.startDate
            ? new Date(activeCycle.startDate)
            : new Date();
          daysInCycle = Math.ceil(
            (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24),
          );
        }

        return {
          id: pond.id,
          code: pond.code,
          name: pond.name,
          area: pond.area,
          status: pond.status,
          activeCycleName: activeCycle?.name || null,
          daysInCycle,
          survivalRate: Math.round(survivalRate * 100) / 100,
          lastTemperature: lastWQ?.temperature || null,
          lastPh: lastWQ?.ph || null,
          lastDO: lastWQ?.dissolvedOxygen || null,
        };
      });

      res.json({ success: true, data: overview });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to compute ponds overview" });
    }
  },
);
