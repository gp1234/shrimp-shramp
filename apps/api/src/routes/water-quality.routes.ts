import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const waterQualityRouter = Router();
waterQualityRouter.use(authenticate);

// GET /api/v1/water-quality
waterQualityRouter.get(
  "/",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { pondId, startDate, endDate, farmId } = req.query;
      const where: any = {};
      if (pondId) where.pondId = pondId;
      if (farmId) where.pond = { farmId };
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate as string);
        if (endDate) where.date.lte = new Date(endDate as string);
      }

      const logs = await prisma.waterQualityLog.findMany({
        where,
        include: { pond: { select: { name: true, code: true } } },
        orderBy: { date: "desc" },
        take: 100,
      });
      res.json({ success: true, data: logs });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch water quality logs" });
    }
  },
);

// POST /api/v1/water-quality
waterQualityRouter.post(
  "/",
  authorize("Admin", "Farm Manager", "Supervisor", "Operator"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const log = await prisma.waterQualityLog.create({ data: req.body });
      res.status(201).json({ success: true, data: log });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create water quality log" });
    }
  },
);

// GET /api/v1/water-quality/pond/:pondId/summary
waterQualityRouter.get(
  "/pond/:pondId/summary",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const logs = await prisma.waterQualityLog.findMany({
        where: { pondId: req.params.pondId },
        orderBy: { date: "desc" },
        take: 30,
      });

      if (logs.length === 0) {
        res.json({ success: true, data: null });
        return;
      }

      const avg = (vals: (number | null)[]) => {
        const valid = vals.filter((v): v is number => v !== null);
        return valid.length > 0
          ? valid.reduce((a, b) => a + b, 0) / valid.length
          : null;
      };

      const summary = {
        avgTemperature: avg(logs.map((l) => l.temperature)),
        avgPh: avg(logs.map((l) => l.ph)),
        avgDissolvedOxygen: avg(logs.map((l) => l.dissolvedOxygen)),
        avgSalinity: avg(logs.map((l) => l.salinity)),
        avgAmmonia: avg(logs.map((l) => l.ammonia)),
        lastReading: logs[0],
        totalReadings: logs.length,
      };

      res.json({ success: true, data: summary });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch water quality summary",
      });
    }
  },
);
