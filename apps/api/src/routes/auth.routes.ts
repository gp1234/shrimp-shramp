import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@shrampi/database";
import { config } from "@shrampi/config";
import {
  authenticate,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const authRouter = Router();

// POST /api/v1/auth/register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: "Email, password, and name are required",
      });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res
        .status(409)
        .json({ success: false, error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    // Assign Viewer role by default
    const viewerRole = await prisma.role.findUnique({
      where: { name: "Viewer" },
    });
    if (viewerRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: viewerRole.id },
      });
    }

    res.status(201).json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, error: "Failed to register" });
  }
});

// POST /api/v1/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, error: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, roles } satisfies {
        userId: string;
        email: string;
        roles: string[];
      },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn },
    );

    const refreshToken = jwt.sign(
      { userId: user.id } satisfies { userId: string },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn },
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        resource: "auth",
        ipAddress: req.ip,
      },
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          roles,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Failed to login" });
  }
});

// POST /api/v1/auth/refresh
authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: "Refresh token required" });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
      userId: string;
    };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      res
        .status(401)
        .json({ success: false, error: "User not found or inactive" });
      return;
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, roles },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn },
    );

    res.json({ success: true, data: { accessToken } });
  } catch {
    res.status(401).json({ success: false, error: "Invalid refresh token" });
  }
});

// GET /api/v1/auth/me
authRouter.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
          company: {
            include: {
              farms: {
                where: { isActive: true },
                orderBy: { name: "asc" },
              },
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: "User not found" });
        return;
      }

      const roles = user.userRoles.map((ur) => ur.role.name);
      const permissions = user.userRoles.flatMap((ur) =>
        ur.role.permissions.map(
          (rp) => `${rp.permission.resource}:${rp.permission.action}`,
        ),
      );

      const farms =
        user.company?.farms.map((farm) => ({
          id: farm.id,
          name: farm.name,
          location: farm.location,
        })) || [];

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          roles,
          permissions,
          farms,
          company: user.company
            ? {
                id: user.company.id,
                name: user.company.name,
                logo: user.company.logo,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Me error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch user" });
    }
  },
);
