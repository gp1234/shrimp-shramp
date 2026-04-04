import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../../middleware/auth.middleware";

export const waterControlRouter = Router();
waterControlRouter.use(authenticate);

// POST /api/v1/water-control
waterControlRouter.post(
  "/",
  authorize("Admin", "Farm Manager", "Supervisor", "Operator"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId, recordDate, recordTime, farmSection, entries } = req.body;

      if (!farmId || !recordDate || !recordTime || !entries?.length) {
        res.status(400).json({
          success: false,
          error: "farmId, recordDate, recordTime, and entries are required",
        });
        return;
      }

      if (!["AM", "PM"].includes(recordTime)) {
        res
          .status(400)
          .json({ success: false, error: "recordTime must be 'AM' or 'PM'" });
        return;
      }

      // Check for duplicate
      const existing = await prisma.dailyWaterControl.findUnique({
        where: {
          farmId_recordDate_recordTime_farmSection: {
            farmId,
            recordDate: new Date(recordDate),
            recordTime,
            farmSection: farmSection ?? null,
          },
        },
      });

      if (existing) {
        res.status(409).json({
          success: false,
          error: "A record already exists for this farm, date, time, and section",
        });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const control = await tx.dailyWaterControl.create({
          data: {
            farmId,
            recordDate: new Date(recordDate),
            recordTime,
            farmSection: farmSection ?? null,
            createdById: req.user!.userId,
            entries: {
              create: entries.map((e: any) => ({
                pondId: e.pondId,
                gateId: e.gateId,
                gateHeightInches: e.gateHeightInches ?? null,
                turbiditySecchiCm: e.turbiditySecchiCm ?? null,
                waterColor: e.waterColor ?? null,
                observations: e.observations ?? null,
              })),
            },
          },
          include: {
            entries: {
              include: {
                pond: { select: { name: true, code: true } },
              },
            },
          },
        });
        return control;
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create daily water control" });
    }
  },
);

// GET /api/v1/water-control
waterControlRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      farmId,
      dateFrom,
      dateTo,
      recordTime,
      farmSection,
      page = "1",
      limit = "20",
    } = req.query;

    const where: any = {};
    if (farmId) where.farmId = farmId;
    if (recordTime) where.recordTime = recordTime;
    if (farmSection) where.farmSection = farmSection;
    if (dateFrom || dateTo) {
      where.recordDate = {};
      if (dateFrom) where.recordDate.gte = new Date(dateFrom as string);
      if (dateTo) where.recordDate.lte = new Date(dateTo as string);
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.dailyWaterControl.count({ where }),
      prisma.dailyWaterControl.findMany({
        where,
        include: {
          entries: {
            include: {
              pond: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: [{ recordDate: "desc" }, { recordTime: "desc" }],
        skip,
        take: pageSize,
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
      .json({ success: false, error: "Failed to fetch daily water controls" });
  }
});

// GET /api/v1/water-control/latest
waterControlRouter.get(
  "/latest",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId } = req.query;
      if (!farmId) {
        res
          .status(400)
          .json({ success: false, error: "farmId query param is required" });
        return;
      }

      const control = await prisma.dailyWaterControl.findFirst({
        where: { farmId: farmId as string },
        include: {
          entries: {
            include: {
              pond: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: [{ recordDate: "desc" }, { recordTime: "desc" }],
      });

      if (!control) {
        res
          .status(404)
          .json({ success: false, error: "No water control records found" });
        return;
      }
      res.json({ success: true, data: control });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch latest water control",
      });
    }
  },
);

// GET /api/v1/water-control/:id
waterControlRouter.get(
  "/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const control = await prisma.dailyWaterControl.findUnique({
        where: { id: req.params.id },
        include: {
          entries: {
            include: {
              pond: { select: { name: true, code: true } },
            },
          },
        },
      });
      if (!control) {
        res
          .status(404)
          .json({ success: false, error: "Daily water control not found" });
        return;
      }
      res.json({ success: true, data: control });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch daily water control" });
    }
  },
);

// PUT /api/v1/water-control/:id
waterControlRouter.put(
  "/:id",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId, recordDate, recordTime, farmSection, entries } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        // Delete old entries
        await tx.dailyWaterPondEntry.deleteMany({
          where: { dailyWaterControlId: req.params.id },
        });

        const control = await tx.dailyWaterControl.update({
          where: { id: req.params.id },
          data: {
            farmId,
            recordDate: recordDate ? new Date(recordDate) : undefined,
            recordTime,
            farmSection,
            entries: entries
              ? {
                  create: entries.map((e: any) => ({
                    pondId: e.pondId,
                    gateId: e.gateId,
                    gateHeightInches: e.gateHeightInches ?? null,
                    turbiditySecchiCm: e.turbiditySecchiCm ?? null,
                    waterColor: e.waterColor ?? null,
                    observations: e.observations ?? null,
                  })),
                }
              : undefined,
          },
          include: {
            entries: {
              include: {
                pond: { select: { name: true, code: true } },
              },
            },
          },
        });
        return control;
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update daily water control" });
    }
  },
);

// DELETE /api/v1/water-control/:id
waterControlRouter.delete(
  "/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await prisma.dailyWaterControl.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: "Daily water control deleted" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete daily water control" });
    }
  },
);
