import { Application } from "express";

import healthRouter from "./health.routes";

import authRouter from "./auth.routes";

import userRouter from "./user.routes";

import chatRouter from "./chat.routes";

import messageRouter from "./message.routes";

import aiRouter from "./ai.routes";
import uploadRouter from "./upload.routes";
import subscriptionRouter from "./subscription.routes";

export function registerRoutes(app: Application): void {
  app.use("/api", healthRouter);

  app.use("/api/auth", authRouter);

  app.use("/api/user", userRouter);

  app.use("/api/chat", chatRouter);

  app.use("/api/message", messageRouter);

  app.use("/api/ai", aiRouter);

  app.use("/api/upload", uploadRouter);

  app.use("/api/v1", subscriptionRouter);
}