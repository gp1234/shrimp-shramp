import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const feedingRouter = Router();
feedingRouter.use(authenticate);

// GET /api/v1/feeding/types
feedingRouter.get(
  "/types",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const types = await prisma.feedType.findMany({
        orderBy: { name: "asc" },
      });
      res.json({ success: true, data: types });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch feed types" });
    }
  },
);

// POST /api/v1/feeding/types
feedingRouter.post(
  "/types",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const type = await prisma.feedType.create({ data: req.body });
      res.status(201).json({ success: true, data: type });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create feed type" });
    }
  },
);

// PUT /api/v1/feeding/types/:id
feedingRouter.put(
  "/types/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const type = await prisma.feedType.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: type });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update feed type" });
    }
  },
);

// GET /api/v1/feeding/logs
feedingRouter.get("/logs", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pondId, cycleId, startDate, endDate, farmId } = req.query;
    const where: any = {};
    if (pondId) where.pondId = pondId;
    if (cycleId) where.cycleId = cycleId;
    if (farmId) where.pond = { farmId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const logs = await prisma.feedingLog.findMany({
      where,
      include: { feedType: true, pond: { select: { name: true, code: true } } },
      orderBy: { date: "desc" },
      take: 100,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch feeding logs" });
  }
});

// POST /api/v1/feeding/logs
feedingRouter.post(
  "/logs",
  authorize("Admin", "Farm Manager", "Supervisor", "Operator"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const log = await prisma.feedingLog.create({ data: req.body });
      res.status(201).json({ success: true, data: log });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create feeding log" });
    }
  },
);

// GET /api/v1/feeding/schedules
feedingRouter.get(
  "/schedules",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const schedules = await prisma.feedingSchedule.findMany({
        include: { feedType: true },
        orderBy: { dayOfCycle: "asc" },
      });
      res.json({ success: true, data: schedules });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch feeding schedules" });
    }
  },
);
