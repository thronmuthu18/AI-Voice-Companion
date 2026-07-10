import { Router } from "express";
import { uploadController, upload } from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth.middleware";
import { uploadLimiter } from "../middleware/rate-limit.middleware";
import { checkQuota } from "../middleware/quota.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  uploadLimiter,
  checkQuota("fileUpload"),
  upload.single("file"),
  uploadController.uploadFile
);

export default router;
