import { Router } from 'express';
import mongoose from 'mongoose';

const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? "ok" : "unavailable",
  });
});

export default healthRouter;