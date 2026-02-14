import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "@shrampi/config";
import { JwtPayload } from "@shrampi/types";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Access token required" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token!, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
    return;
  }
}

export function authorize(...requiredRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }

    if (
      requiredRoles.length > 0 &&
      !requiredRoles.some((role) => req.user!.roles.includes(role))
    ) {
      res
        .status(403)
        .json({ success: false, error: "Insufficient permissions" });
      return;
    }

    next();
  };
}
