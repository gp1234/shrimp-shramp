import * as dotenv from "dotenv";
import * as path from "path";

const isProd = process.env.NODE_ENV === "production";

// Only load .env files in development (production uses real env vars)
if (!isProd) {
  dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
  dotenv.config(); // Also try local .env
}

const DATABASE_URL =
  process.env.DATABASE_URL ||
  (isProd
    ? (() => {
        throw new Error("DATABASE_URL must be set in production");
      })()
    : "postgresql://shrampi:shrampi_dev_2024@localhost:5432/shrampi?schema=public");

export const config = {
  database: {
    url: DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "shrampi-dev-secret",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "shrampi-refresh-dev-secret",
    accessExpiresIn: "15m",
    refreshExpiresIn: "7d",
  },
  api: {
    port: parseInt(process.env.API_PORT || "3001", 10),
    corsOrigins: (
      process.env.CORS_ORIGINS ||
      (isProd ? "*" : "http://localhost:3000,http://localhost:3002")
    ).split(","),
  },
  web: {
    port: parseInt(process.env.WEB_PORT || "3000", 10),
  },
  admin: {
    port: parseInt(process.env.ADMIN_PORT || "3002", 10),
  },
  isDev: !isProd,
} as const;

export type Config = typeof config;
