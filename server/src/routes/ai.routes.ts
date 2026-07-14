import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth.middleware";
import { imageLimiter, streamLimiter, burstLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

// Normal AI Chat — authenticate, burst abuse limiter, then quota-enforced 15-min limiter
router.post(
  "/chat",
  authenticate,
  burstLimiter,
  streamLimiter,
  aiController.generateResponse
);

// Streaming AI Chat — authenticate, burst abuse limiter, then quota-enforced 15-min limiter
router.post(
  "/stream",
  authenticate,
  burstLimiter,
  streamLimiter,
  aiController.streamResponse
);

// Image generation/editing gets tighter limit
router.post(
  "/image",
  authenticate,
  burstLimiter,
  imageLimiter,
  aiController.generateResponse
);

export default router;