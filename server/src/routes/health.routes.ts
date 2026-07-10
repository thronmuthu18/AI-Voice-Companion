import { Router } from 'express';
import mongoose from 'mongoose';

const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'UP' : 'DOWN',
    services: {
      api: 'UP',
      database: (states as any)[dbState] || 'unknown',
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default healthRouter;