import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { registerValidator, loginValidator, resetPasswordValidator } from "../validators/auth.validator";
import { authLimiter } from "../middleware/rate-limit.middleware";
import { restrictBruteForce } from "../middleware/brute-force.middleware";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Register (protected by rate limit and brute-force block)
router.post(
  "/register",
  authLimiter,
  restrictBruteForce("register"),
  registerValidator,
  authController.register
);

// Login (protected by rate limit and brute-force block)
router.post(
  "/login",
  authLimiter,
  restrictBruteForce("login"),
  loginValidator,
  authController.login
);

// Password Reset (protected by rate limit and brute-force block)
router.post(
  "/reset-password",
  authLimiter,
  restrictBruteForce("reset"),
  resetPasswordValidator,
  authController.resetPassword
);

// Refresh access token
router.post(
  "/refresh",
  authLimiter,
  authController.refresh
);

// Logout current device (requires auth)
router.post(
  "/logout",
  authenticate,
  authController.logout
);

// Logout all devices (requires auth)
router.post(
  "/logout-all",
  authenticate,
  authController.logoutAll
);

export default router;