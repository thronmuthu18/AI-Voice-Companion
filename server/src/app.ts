import express, { Application } from 'express';
import { applyMiddleware, applyErrorHandlers } from './middleware';
import { registerRoutes } from './routes';

export function createApp(): Application {
  const app = express();

  // Trust proxy for secure cookies and rate limit IP headers behind reverse proxies
  app.set("trust proxy", 1);

  applyMiddleware(app);
  registerRoutes(app);
  applyErrorHandlers(app); // Must come after routes

  return app;
}
