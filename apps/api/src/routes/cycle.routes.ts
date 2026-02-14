import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const cycleRouter = Router();
cycleRouter.use(authenticate);

// GET /api/v1/cycles
cycleRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pondId, status } = req.query;
    const where: any = {};
    if (pondId) where.pondId = pondId;
    if (status) where.status = status;

    const cycles = await prisma.cycle.findMany({
      where,
      include: {
        pond: { select: { name: true, code: true, area: true } },
        _count: {
          select: {
            feedingLogs: true,
            mortalityRecords: true,
            harvestRecords: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });
    res.json({ success: true, data: cycles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch cycles" });
  }
});

// GET /api/v1/cycles/:id
cycleRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cycle = await prisma.cycle.findUnique({
      where: { id: req.params.id },
      include: {
        pond: true,
        stages: { orderBy: { startDate: "asc" } },
        stockingRecords: true,
        harvestRecords: true,
        mortalityRecords: { orderBy: { date: "asc" } },
        feedingLogs: {
          orderBy: { date: "desc" },
          take: 30,
          include: { feedType: true },
        },
        productionCosts: { include: { category: true } },
        revenueRecords: true,
      },
    });
    if (!cycle) {
      res.status(404).json({ success: false, error: "Cycle not found" });
      return;
    }
    res.json({ success: true, data: cycle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch cycle" });
  }
});

// POST /api/v1/cycles
cycleRouter.post(
  "/",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cycle = await prisma.cycle.create({ data: req.body });
      res.status(201).json({ success: true, data: cycle });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to create cycle" });
    }
  },
);

// PUT /api/v1/cycles/:id
cycleRouter.put(
  "/:id",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cycle = await prisma.cycle.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: cycle });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to update cycle" });
    }
  },
);

// DELETE /api/v1/cycles/:id
cycleRouter.delete(
  "/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await prisma.cycle.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: "Cycle deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to delete cycle" });
    }
  },
);

// POST /api/v1/cycles/:id/stocking
cycleRouter.post(
  "/:id/stocking",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const record = await prisma.stockingRecord.create({
        data: { ...req.body, cycleId: req.params.id },
      });
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create stocking record" });
    }
  },
);

// POST /api/v1/cycles/:id/harvest
cycleRouter.post(
  "/:id/harvest",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const record = await prisma.harvestRecord.create({
        data: { ...req.body, cycleId: req.params.id },
      });
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create harvest record" });
    }
  },
);

// POST /api/v1/cycles/:id/mortality
cycleRouter.post(
  "/:id/mortality",
  authorize("Admin", "Farm Manager", "Supervisor", "Operator"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const record = await prisma.mortalityRecord.create({
        data: { ...req.body, cycleId: req.params.id },
      });
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create mortality record" });
    }
  },
);
