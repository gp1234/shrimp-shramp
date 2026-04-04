import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@shrampi/database";
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

function generatePassword(): string {
  return crypto.randomBytes(4).toString("hex") + "A1!";
}

const POSITION_TO_ROLE: Record<string, string> = {
  "Farm Manager": "Farm Manager",
  Supervisor: "Supervisor",
  Operator: "Operator",
};

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
        include: {
          farm: { select: { name: true } },
          user: {
            select: {
              email: true,
              isActive: true,
              userRoles: {
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: { select: { resource: true, action: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { lastName: "asc" },
      });

      // Flatten permissions for frontend
      const result = staff.map((s) => {
        const permissions = s.user?.userRoles?.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.resource),
        ) || [];
        const uniqueResources = [...new Set(permissions)];
        return {
          ...s,
          user: s.user ? {
            email: s.user.email,
            isActive: s.user.isActive,
            accessiblePages: uniqueResources,
          } : null,
        };
      });
      res.json({ success: true, data: result });
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
      const { firstName, lastName, position, phone, farmId, hireDate, email, accessiblePages } =
        req.body;

      if (!firstName || !lastName || !position || !farmId) {
        res.status(400).json({
          success: false,
          error: "firstName, lastName, position, and farmId are required",
        });
        return;
      }

      // Auto-generate email if not provided
      const userEmail =
        email ||
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}@shrampi.local`;

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail },
      });
      if (existingUser) {
        res
          .status(409)
          .json({ success: false, error: "Email already registered" });
        return;
      }

      const plainPassword = generatePassword();
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      // Get the admin's company
      const adminUser = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { companyId: true },
      });

      // Find role matching position
      const roleName = POSITION_TO_ROLE[position] || "Viewer";
      const role = await prisma.role.findUnique({ where: { name: roleName } });

      const result = await prisma.$transaction(async (tx) => {
        // Create User
        const user = await tx.user.create({
          data: {
            email: userEmail,
            passwordHash,
            name: `${firstName} ${lastName}`,
            companyId: adminUser?.companyId || null,
          },
        });

        // Create custom role with selected page permissions
        if (accessiblePages && Array.isArray(accessiblePages)) {
          const customRole = await tx.role.create({
            data: {
              name: `custom_${user.id}_${Date.now()}`,
              description: `Custom permissions`,
            },
          });
          const actions = ["create", "read", "update", "delete"];
          for (const resource of accessiblePages as string[]) {
            for (const action of actions) {
              const perm = await tx.permission.findUnique({
                where: { resource_action: { resource, action } },
              });
              if (perm) {
                await tx.rolePermission.create({
                  data: { roleId: customRole.id, permissionId: perm.id },
                });
              }
            }
          }
          await tx.userRole.create({
            data: { userId: user.id, roleId: customRole.id },
          });
        } else if (role) {
          await tx.userRole.create({
            data: { userId: user.id, roleId: role.id },
          });
        }

        // Create Staff linked to User
        const staff = await tx.staff.create({
          data: {
            userId: user.id,
            farmId,
            firstName,
            lastName,
            position,
            phone: phone || null,
            hireDate: hireDate ? new Date(hireDate) : new Date(),
          },
          include: { farm: { select: { name: true } } },
        });

        return { staff, user, role: roleName };
      });

      res.status(201).json({
        success: true,
        data: {
          ...result.staff,
          credentials: {
            email: userEmail,
            password: plainPassword,
            role: result.role,
          },
        },
      });
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
      const {
        firstName,
        lastName,
        position,
        phone,
        farmId,
        email,
        password,
        isActive,
        accessiblePages,
      } = req.body;

      const existing = await prisma.staff.findUnique({
        where: { id: req.params.id },
        select: { userId: true },
      });

      await prisma.$transaction(async (tx) => {
        // Update staff fields
        const staffData: any = {};
        if (firstName !== undefined) staffData.firstName = firstName;
        if (lastName !== undefined) staffData.lastName = lastName;
        if (position !== undefined) staffData.position = position;
        if (phone !== undefined) staffData.phone = phone || null;
        if (farmId !== undefined) staffData.farmId = farmId;

        await tx.staff.update({
          where: { id: req.params.id },
          data: staffData,
        });

        // Update user account if linked
        if (existing?.userId) {
          const userData: any = {};
          if (email !== undefined) userData.email = email;
          if (isActive !== undefined) userData.isActive = isActive;
          if (firstName !== undefined || lastName !== undefined) {
            const staff = await tx.staff.findUnique({
              where: { id: req.params.id },
            });
            userData.name = `${staff!.firstName} ${staff!.lastName}`;
          }
          if (password && password.length >= 6) {
            userData.passwordHash = await bcrypt.hash(password, 10);
          }

          if (Object.keys(userData).length > 0) {
            await tx.user.update({
              where: { id: existing.userId },
              data: userData,
            });
          }

          // Update page permissions
          if (accessiblePages !== undefined) {
            // Remove all existing role-permissions for this user
            const userRoles = await tx.userRole.findMany({
              where: { userId: existing.userId },
            });
            for (const ur of userRoles) {
              await tx.rolePermission.deleteMany({
                where: { roleId: ur.roleId },
              });
            }
            // Remove old user roles
            await tx.userRole.deleteMany({
              where: { userId: existing.userId },
            });

            // Create a custom role for this user
            const customRole = await tx.role.create({
              data: {
                name: `custom_${existing.userId}_${Date.now()}`,
                description: `Custom permissions`,
              },
            });

            // Assign permissions for selected pages (all CRUD actions)
            const actions = ["create", "read", "update", "delete"];
            for (const resource of accessiblePages as string[]) {
              for (const action of actions) {
                const perm = await tx.permission.findUnique({
                  where: { resource_action: { resource, action } },
                });
                if (perm) {
                  await tx.rolePermission.create({
                    data: { roleId: customRole.id, permissionId: perm.id },
                  });
                }
              }
            }

            await tx.userRole.create({
              data: { userId: existing.userId, roleId: customRole.id },
            });
          }
        }
      });

      res.json({ success: true, message: "Staff updated" });
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
