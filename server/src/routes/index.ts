import { Application } from "express";

import healthRouter from "./health.routes";
import authRouter from "./auth.routes";

export function registerRoutes(app: Application): void {
  app.use("/api", healthRouter);

  app.use("/api/auth", authRouter);
}