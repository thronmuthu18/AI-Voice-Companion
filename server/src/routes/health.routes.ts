import { Router } from 'express';

const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI OS API is running.',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default healthRouter;