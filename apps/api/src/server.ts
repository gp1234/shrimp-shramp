import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { config } from "@shrampi/config";
import { authRouter } from "./routes/auth.routes";
import { farmRouter } from "./routes/farm.routes";
import { pondRouter } from "./routes/pond.routes";
import { cycleRouter } from "./routes/cycle.routes";
import { feedingRouter } from "./routes/feeding.routes";
import { waterQualityRouter } from "./routes/water-quality.routes";
import { inventoryRouter } from "./routes/inventory.routes";
import { personnelRouter } from "./routes/personnel.routes";
import { financialRouter } from "./routes/financial.routes";
import { kpiRouter } from "./routes/kpi.routes";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

// ── Middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.api.corsOrigins, credentials: true }));
app.use(express.json());
app.use(morgan(config.isDev ? "dev" : "combined"));

// ── Health check ──
app.get("/api/v1/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "shrampi-api",
  });
});

// ── Routes ──
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/farms", farmRouter);
app.use("/api/v1/ponds", pondRouter);
app.use("/api/v1/cycles", cycleRouter);
app.use("/api/v1/feeding", feedingRouter);
app.use("/api/v1/water-quality", waterQualityRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/personnel", personnelRouter);
app.use("/api/v1/financial", financialRouter);
app.use("/api/v1/kpi", kpiRouter);

// ── Error handler ──
app.use(errorHandler);

// ── Serve React frontend in production ──
if (!config.isDev) {
  const webDist = path.resolve(__dirname, "../../web/dist");
  app.use(express.static(webDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

// ── Start server ──
app.listen(config.api.port, () => {
  console.log(`🦐 Shrampi running on http://localhost:${config.api.port}`);
  if (!config.isDev) {
    console.log(`   Serving frontend + API from single port`);
  }
  console.log(`   Health: http://localhost:${config.api.port}/api/v1/health`);
});

export default app;
