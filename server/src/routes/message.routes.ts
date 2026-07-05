import { Router } from "express";
import { messageController } from "../controllers/message.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Create Message
router.post(
  "/",
  authenticate,
  messageController.createMessage
);

// Get Messages by Chat ID
router.get(
  "/:chatId",
  authenticate,
  messageController.getMessages
);

export default router;