import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const financialRouter = Router();
financialRouter.use(authenticate);

// GET /api/v1/financial/categories
financialRouter.get(
  "/categories",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const categories = await prisma.expenseCategory.findMany({
        orderBy: { name: "asc" },
      });
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch expense categories" });
    }
  },
);

// GET /api/v1/financial/operational-costs
financialRouter.get(
  "/operational-costs",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId, startDate, endDate } = req.query;
      const where: any = {};
      if (farmId) where.farmId = farmId;
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate as string);
        if (endDate) where.date.lte = new Date(endDate as string);
      }

      const costs = await prisma.operationalCost.findMany({
        where,
        include: { category: true, farm: { select: { name: true } } },
        orderBy: { date: "desc" },
      });
      res.json({ success: true, data: costs });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch operational costs" });
    }
  },
);

// POST /api/v1/financial/operational-costs
financialRouter.post(
  "/operational-costs",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cost = await prisma.operationalCost.create({ data: req.body });
      res.status(201).json({ success: true, data: cost });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create operational cost" });
    }
  },
);

// GET /api/v1/financial/production-costs
financialRouter.get(
  "/production-costs",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { cycleId } = req.query;
      const where: any = {};
      if (cycleId) where.cycleId = cycleId;

      const costs = await prisma.productionCost.findMany({
        where,
        include: { category: true, cycle: { select: { name: true } } },
        orderBy: { date: "desc" },
      });
      res.json({ success: true, data: costs });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch production costs" });
    }
  },
);

// POST /api/v1/financial/production-costs
financialRouter.post(
  "/production-costs",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cost = await prisma.productionCost.create({ data: req.body });
      res.status(201).json({ success: true, data: cost });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create production cost" });
    }
  },
);

// GET /api/v1/financial/revenue
financialRouter.get(
  "/revenue",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { cycleId } = req.query;
      const where: any = {};
      if (cycleId) where.cycleId = cycleId;

      const revenue = await prisma.revenueRecord.findMany({
        where,
        include: { cycle: { select: { name: true } } },
        orderBy: { date: "desc" },
      });
      res.json({ success: true, data: revenue });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch revenue records" });
    }
  },
);

// POST /api/v1/financial/revenue
financialRouter.post(
  "/revenue",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const record = await prisma.revenueRecord.create({ data: req.body });
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create revenue record" });
    }
  },
);
