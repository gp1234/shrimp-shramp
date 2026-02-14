import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const farmRouter = Router();
farmRouter.use(authenticate);

// GET /api/v1/farms
farmRouter.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const farms = await prisma.farm.findMany({
      include: { _count: { select: { ponds: true, staff: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: farms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch farms" });
  }
});

// GET /api/v1/farms/:id
farmRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const farm = await prisma.farm.findUnique({
      where: { id: req.params.id },
      include: { ponds: true, staff: true, devices: true },
    });
    if (!farm) {
      res.status(404).json({ success: false, error: "Farm not found" });
      return;
    }
    res.json({ success: true, data: farm });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch farm" });
  }
});

// POST /api/v1/farms
farmRouter.post(
  "/",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const farm = await prisma.farm.create({ data: req.body });
      res.status(201).json({ success: true, data: farm });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to create farm" });
    }
  },
);

// PUT /api/v1/farms/:id
farmRouter.put(
  "/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const farm = await prisma.farm.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: farm });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to update farm" });
    }
  },
);

// DELETE /api/v1/farms/:id
farmRouter.delete(
  "/:id",
  authorize("Admin"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await prisma.farm.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: "Farm deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to delete farm" });
    }
  },
);
