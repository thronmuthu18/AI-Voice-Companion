import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { registerValidator } from "../validators/auth.validator";

const router = Router();

// Register
router.post(
  "/register",
  registerValidator,
  authController.register
);

// Login
router.post(
  "/login",
  authController.login
);

export default router;