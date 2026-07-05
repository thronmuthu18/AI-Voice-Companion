import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Normal AI Chat
router.post(
  "/chat",
  authenticate,
  aiController.generateResponse
);

// Streaming AI Chat
router.post(
  "/stream",
  authenticate,
  aiController.streamResponse
);

export default router;