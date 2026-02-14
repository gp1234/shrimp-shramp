import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const personnelRouter = Router();
personnelRouter.use(authenticate);

// GET /api/v1/personnel/staff
personnelRouter.get(
  "/staff",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId } = req.query;
      const where: any = {};
      if (farmId) where.farmId = farmId;

      const staff = await prisma.staff.findMany({
        where,
        include: { farm: { select: { name: true } } },
        orderBy: { lastName: "asc" },
      });
      res.json({ success: true, data: staff });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to fetch staff" });
    }
  },
);

// POST /api/v1/personnel/staff
personnelRouter.post(
  "/staff",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const staff = await prisma.staff.create({ data: req.body });
      res.status(201).json({ success: true, data: staff });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to create staff" });
    }
  },
);

// PUT /api/v1/personnel/staff/:id
personnelRouter.put(
  "/staff/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const staff = await prisma.staff.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: staff });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to update staff" });
    }
  },
);

// GET /api/v1/personnel/tasks
personnelRouter.get(
  "/tasks",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { pondId, status, priority } = req.query;
      const where: any = {};
      if (pondId) where.pondId = pondId;
      if (status) where.status = status;
      if (priority) where.priority = priority;

      const tasks = await prisma.task.findMany({
        where,
        include: {
          pond: { select: { name: true, code: true } },
          assignments: {
            include: { staff: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      });
      res.json({ success: true, data: tasks });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to fetch tasks" });
    }
  },
);

// POST /api/v1/personnel/tasks
personnelRouter.post(
  "/tasks",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await prisma.task.create({ data: req.body });
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to create task" });
    }
  },
);

// PUT /api/v1/personnel/tasks/:id
personnelRouter.put(
  "/tasks/:id",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: task });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to update task" });
    }
  },
);

// POST /api/v1/personnel/attendance
personnelRouter.post(
  "/attendance",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const record = await prisma.attendance.create({ data: req.body });
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create attendance record" });
    }
  },
);
