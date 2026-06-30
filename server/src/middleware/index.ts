import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';

export function applyMiddleware(app: Application): void {
  app.use(cors());
  app.use(helmet());
  app.use(express.json());
}
