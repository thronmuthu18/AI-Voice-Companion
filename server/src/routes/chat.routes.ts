import { Router } from "express";
import { chatController } from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Create Chat
router.post(
  "/",
  authenticate,
  chatController.createChat
);

// Get All Chats
router.get(
  "/",
  authenticate,
  chatController.getChats
);

// Rename Chat
router.put(
  "/:chatId",
  authenticate,
  chatController.renameChat
);

// Pin / Unpin Chat
router.patch(
  "/:chatId/pin",
  authenticate,
  chatController.pinChat
);

// Archive Chat
router.patch(
  "/:chatId/archive",
  authenticate,
  chatController.archiveChat
);

// Delete Chat
router.delete(
  "/:chatId",
  authenticate,
  chatController.deleteChat
);

export default router;