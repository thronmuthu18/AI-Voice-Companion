import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth.middleware";
import { imageLimiter, streamLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

// Normal AI Chat
router.post(
  "/chat",
  authenticate,
  streamLimiter,
  aiController.generateResponse
);

// Streaming AI Chat
router.post(
  "/stream",
  authenticate,
  streamLimiter,
  aiController.streamResponse
);

// Image generation/editing gets tighter limit
router.post(
  "/image",
  authenticate,
  imageLimiter,
  aiController.generateResponse
);

export default router;