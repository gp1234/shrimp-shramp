import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

// GET /api/v1/inventory/items
inventoryRouter.get(
  "/items",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category, lowStock } = req.query;
      const where: any = {};
      if (category) where.category = category;

      let items = await prisma.inventoryItem.findMany({
        where,
        orderBy: { name: "asc" },
      });

      if (lowStock === "true") {
        items = items.filter((i) => i.currentStock <= i.minimumStock);
      }

      res.json({ success: true, data: items });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch inventory items" });
    }
  },
);

// POST /api/v1/inventory/items
inventoryRouter.post(
  "/items",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = await prisma.inventoryItem.create({ data: req.body });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create inventory item" });
    }
  },
);

// PUT /api/v1/inventory/items/:id
inventoryRouter.put(
  "/items/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = await prisma.inventoryItem.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: item });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update inventory item" });
    }
  },
);

// POST /api/v1/inventory/movements
inventoryRouter.post(
  "/movements",
  authorize("Admin", "Farm Manager", "Supervisor", "Operator"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { itemId, type, quantity, reason, reference } = req.body;

      const movement = await prisma.inventoryMovement.create({
        data: {
          itemId,
          type,
          quantity,
          reason,
          reference,
          movedBy: req.user?.email,
        },
      });

      // Update stock
      const delta = type === "IN" ? quantity : type === "OUT" ? -quantity : 0;
      if (delta !== 0) {
        await prisma.inventoryItem.update({
          where: { id: itemId },
          data: { currentStock: { increment: delta } },
        });
      }

      res.status(201).json({ success: true, data: movement });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create inventory movement" });
    }
  },
);

// GET /api/v1/inventory/movements
inventoryRouter.get(
  "/movements",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { itemId } = req.query;
      const where: any = {};
      if (itemId) where.itemId = itemId;

      const movements = await prisma.inventoryMovement.findMany({
        where,
        include: { item: { select: { name: true, unit: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json({ success: true, data: movements });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch movements" });
    }
  },
);

// ── Suppliers ──
inventoryRouter.get(
  "/suppliers",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const suppliers = await prisma.supplier.findMany({
        orderBy: { name: "asc" },
      });
      res.json({ success: true, data: suppliers });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch suppliers" });
    }
  },
);

inventoryRouter.post(
  "/suppliers",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplier = await prisma.supplier.create({ data: req.body });
      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create supplier" });
    }
  },
);
