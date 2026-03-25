import { Router, Response } from "express";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../../middleware/auth.middleware";

export const preweightRouter = Router();
preweightRouter.use(authenticate);

// POST /api/v1/sampling/preweight
preweightRouter.post(
  "/",
  authorize("Admin", "Farm Manager", "Supervisor", "Operator"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId, samplingDate, notes, entries } = req.body;

      if (!farmId || !samplingDate || !entries?.length) {
        res
          .status(400)
          .json({ success: false, error: "farmId, samplingDate, and entries are required" });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const preweight = await tx.weeklyPreweight.create({
          data: {
            farmId,
            samplingDate: new Date(samplingDate),
            notes,
            createdById: req.user!.userId,
            entries: {
              create: entries.map((entry: any) => {
                const samples = entry.samples || [];
                const totalNumber = samples.reduce((sum: number, s: any) => sum + s.number, 0);
                const totalWeight = samples.reduce((sum: number, s: any) => sum + s.weight, 0);
                const averageWeight = totalNumber > 0 ? totalWeight / totalNumber : 0;

                return {
                  pondId: entry.pondId,
                  growthRate: entry.growthRate,
                  mortality: entry.mortality ?? 0,
                  disease: entry.disease ?? 0,
                  molt: entry.molt ?? 0,
                  cultureDays: entry.cultureDays,
                  totalNumber,
                  totalWeight,
                  averageWeight,
                  samples: {
                    create: samples.map((s: any) => ({
                      number: s.number,
                      weight: s.weight,
                      averageWeight: s.number > 0 ? s.weight / s.number : 0,
                    })),
                  },
                };
              }),
            },
          },
          include: {
            entries: {
              include: {
                pond: { select: { name: true, code: true } },
                samples: true,
              },
            },
          },
        });
        return preweight;
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create weekly preweight" });
    }
  },
);

// GET /api/v1/sampling/preweight
preweightRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { farmId, pondId, dateFrom, dateTo, page = "1", limit = "20" } = req.query;
    const where: any = {};
    if (farmId) where.farmId = farmId;
    if (pondId) where.entries = { some: { pondId } };
    if (dateFrom || dateTo) {
      where.samplingDate = {};
      if (dateFrom) where.samplingDate.gte = new Date(dateFrom as string);
      if (dateTo) where.samplingDate.lte = new Date(dateTo as string);
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.weeklyPreweight.count({ where }),
      prisma.weeklyPreweight.findMany({
        where,
        include: {
          entries: {
            include: {
              pond: { select: { name: true, code: true } },
              samples: true,
            },
          },
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
      .json({ success: false, error: "Failed to fetch weekly preweights" });
  }
});

// GET /api/v1/sampling/preweight/:id
preweightRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const preweight = await prisma.weeklyPreweight.findUnique({
      where: { id: req.params.id },
      include: {
        entries: {
          include: {
            pond: { select: { name: true, code: true } },
            samples: true,
          },
        },
      },
    });
    if (!preweight) {
      res.status(404).json({ success: false, error: "Weekly preweight not found" });
      return;
    }
    res.json({ success: true, data: preweight });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch weekly preweight" });
  }
});

// PUT /api/v1/sampling/preweight/:id
preweightRouter.put(
  "/:id",
  authorize("Admin", "Farm Manager", "Supervisor"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { farmId, samplingDate, notes, entries } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        // Delete old entries (cascades to samples)
        await tx.preweightPondEntry.deleteMany({
          where: { weeklyPreweightId: req.params.id },
        });

        const preweight = await tx.weeklyPreweight.update({
          where: { id: req.params.id },
          data: {
            farmId,
            samplingDate: samplingDate ? new Date(samplingDate) : undefined,
            notes,
            entries: entries
              ? {
                  create: entries.map((entry: any) => {
                    const samples = entry.samples || [];
                    const totalNumber = samples.reduce(
                      (sum: number, s: any) => sum + s.number,
                      0,
                    );
                    const totalWeight = samples.reduce(
                      (sum: number, s: any) => sum + s.weight,
                      0,
                    );
                    const averageWeight =
                      totalNumber > 0 ? totalWeight / totalNumber : 0;

                    return {
                      pondId: entry.pondId,
                      growthRate: entry.growthRate,
                      mortality: entry.mortality ?? 0,
                      disease: entry.disease ?? 0,
                      molt: entry.molt ?? 0,
                      cultureDays: entry.cultureDays,
                      totalNumber,
                      totalWeight,
                      averageWeight,
                      samples: {
                        create: samples.map((s: any) => ({
                          number: s.number,
                          weight: s.weight,
                          averageWeight: s.number > 0 ? s.weight / s.number : 0,
                        })),
                      },
                    };
                  }),
                }
              : undefined,
          },
          include: {
            entries: {
              include: {
                pond: { select: { name: true, code: true } },
                samples: true,
              },
            },
          },
        });
        return preweight;
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update weekly preweight" });
    }
  },
);

// DELETE /api/v1/sampling/preweight/:id
preweightRouter.delete(
  "/:id",
  authorize("Admin", "Farm Manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await prisma.weeklyPreweight.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: "Weekly preweight deleted" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete weekly preweight" });
    }
  },
);
