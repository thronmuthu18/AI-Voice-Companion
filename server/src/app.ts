import express, { Application } from 'express';
import { applyMiddleware } from './middleware';
import { registerRoutes } from './routes';

export function createApp(): Application {
  const app = express();

  applyMiddleware(app);
  registerRoutes(app);

  return app;
}
