import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../../middleware/auth.middleware";

export const populationRouter = Router();
populationRouter.use(authenticate);

function calculatePopulationFields(body: any) {
  const castNetCounts: number[] = body.castNetCounts || [];
  const totalCount = castNetCounts.reduce((sum: number, n: number) => sum + n, 0);
  const numberOfThrows = body.numberOfThrows;
  const countPerThrow = numberOfThrows > 0 ? totalCount / numberOfThrows : 0;
  // 1 cast net ≈ 1 m², so shrimpPerSqMeter ≈ countPerThrow
  const shrimpPerSqMeter = countPerThrow;

  const oldMolts = body.oldMolts ?? 0;
  const freshMolts = body.freshMolts ?? 0;
  const diseaseCount = body.diseaseCount ?? 0;
  const sampleTotal = oldMolts + freshMolts + diseaseCount + totalCount || 1;

  return {
    farmId: body.farmId,
    pondId: body.pondId,
    samplingDate: new Date(body.samplingDate),
    hectares: body.hectares,
    stockingCount: body.stockingCount,
    castNetCounts,
    gridColumns: body.gridColumns ?? 4,
    entradaRows: body.entradaRows ?? 5,
    salidaRows: body.salidaRows ?? 1,
    numberOfThrows,
    totalCount,
    countPerThrow,
    shrimpPerSqMeter,
    averageWeight: body.averageWeight,
    waterLevel: body.waterLevel,
    oldMolts,
    oldMoltsPercent: totalCount > 0 ? (oldMolts / totalCount) * 100 : 0,
    freshMolts,
    freshMoltsPercent: totalCount > 0 ? (freshMolts / totalCount) * 100 : 0,
    diseaseCount,
    diseasePercent: totalCount > 0 ? (diseaseCount / totalCount) * 100 : 0,
    observations: body.observations ?? null,
  };
}

// POST /api/v1/sampling/population
populationRouter.post(
  "/",
  authorize("Admin", "Farm Manager", "Supervisor", "Operator"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId, pondId, samplingDate, numberOfThrows } = req.body;
      if (!farmId || !pondId || !samplingDate || !numberOfThrows) {
        res.status(400).json({
          success: false,
          error: "farmId, pondId, samplingDate, and numberOfThrows are required",
        });
        return;
      }

      const data = calculatePopulationFields(req.body);
      const sampling = await prisma.populationSampling.create({
        data: {
          ...data,
          createdById: req.user!.userId,
        },
        include: {
          pond: { select: { name: true, code: true } },
        },
      });

      res.status(201).json({ success: true, data: sampling });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create population sampling" });
    }
  },
);

// GET /api/v1/sampling/population
populationRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { farmId, pondId, dateFrom, dateTo, page = "1", limit = "20" } = req.query;
    const where: any = {};
    if (farmId) where.farmId = farmId;
    if (pondId) where.pondId = pondId;
    if (dateFrom || dateTo) {
      where.samplingDate = {};
      if (dateFrom) where.samplingDate.gte = new Date(dateFrom as string);
      if (dateTo) where.samplingDate.lte = new Date(dateTo as string);
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.populationSampling.count({ where }),
      prisma.populationSampling.findMany({
        where,
        include: {
          pond: { select: { name: true, code: true } },
        },
        orderBy: { samplingDate: "desc" },
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
      .json({ success: false, error: "Failed to fetch population samplings" });
  }
});

// GET /api/v1/sampling/population/:id
populationRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sampling = await prisma.populationSampling.findUnique({
      where: { id: req.params.id },
      include: {
        pond: { select: { name: true, code: true } },
      },
    });
    if (!sampling) {
      res
        .status(404)
        .json({ success: false, error: "Population sampling not found" });
      return;
    }
    res.json({ success: true, data: sampling });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch population sampling" });
  }
});

// PUT /api/v1/sampling/population/:id
populationRouter.put(
  "/:id",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = calculatePopulationFields(req.body);
      const sampling = await prisma.populationSampling.update({
        where: { id: req.params.id },
        data,
        include: {
          pond: { select: { name: true, code: true } },
        },
      });
      res.json({ success: true, data: sampling });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update population sampling" });
    }
  },
);

// DELETE /api/v1/sampling/population/:id
populationRouter.delete(
  "/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await prisma.populationSampling.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: "Population sampling deleted" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete population sampling" });
    }
  },
);
