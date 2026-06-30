import { Application } from 'express';
import healthRouter from './health.routes';

export function registerRoutes(app: Application): void {
  app.use('/api', healthRouter);
}