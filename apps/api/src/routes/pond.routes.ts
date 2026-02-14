import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const pondRouter = Router();
pondRouter.use(authenticate);

// GET /api/v1/ponds
pondRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { farmId, status } = req.query;
    const where: any = {};
    if (farmId) where.farmId = farmId;
    if (status) where.status = status;

    const ponds = await prisma.pond.findMany({
      where,
      include: {
        farm: { select: { name: true } },
        _count: {
          select: { cycles: true, feedingLogs: true, waterQualityLogs: true },
        },
      },
      orderBy: { code: "asc" },
    });
    res.json({ success: true, data: ponds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch ponds" });
  }
});

// GET /api/v1/ponds/:id
pondRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pond = await prisma.pond.findUnique({
      where: { id: req.params.id },
      include: {
        farm: true,
        zones: true,
        sensors: true,
        cycles: { orderBy: { startDate: "desc" }, take: 5 },
        waterQualityLogs: { orderBy: { date: "desc" }, take: 14 },
        feedingLogs: {
          orderBy: { date: "desc" },
          take: 14,
          include: { feedType: true },
        },
      },
    });
    if (!pond) {
      res.status(404).json({ success: false, error: "Pond not found" });
      return;
    }
    res.json({ success: true, data: pond });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch pond" });
  }
});

// POST /api/v1/ponds
pondRouter.post(
  "/",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pond = await prisma.pond.create({ data: req.body });
      res.status(201).json({ success: true, data: pond });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to create pond" });
    }
  },
);

// PUT /api/v1/ponds/:id
pondRouter.put(
  "/:id",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pond = await prisma.pond.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: pond });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to update pond" });
    }
  },
);

// DELETE /api/v1/ponds/:id
pondRouter.delete(
  "/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await prisma.pond.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: "Pond deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to delete pond" });
    }
  },
);
