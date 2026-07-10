import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Protected Route
router.get(
  "/profile",
  authenticate,
  userController.getProfile
);

router.get(
  "/usage",
  authenticate,
  userController.getUsageSummary
);

export default router;