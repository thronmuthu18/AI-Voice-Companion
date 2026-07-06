import cors from "cors";
import express, { Application } from "express";
import helmet from "helmet";
import path from "path";

export function applyMiddleware(app: Application): void {
  app.use(cors());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve uploads statically
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"))
  );
}
