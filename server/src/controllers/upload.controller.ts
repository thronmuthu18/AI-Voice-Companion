import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { auditService } from "../services/audit.service";

// Allowed MIME types (strictly whitelisted)
const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  // Video
  "video/mp4",
  "video/webm",
]);

// Blocked dangerous extensions
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".ps1", ".psm1", ".psd1",
  ".dll", ".so", ".dylib", ".php", ".php3", ".php4", ".php5",
  ".phtml", ".asp", ".aspx", ".jsp", ".cgi", ".pl", ".rb",
  ".py", ".js", ".ts", ".mjs", ".vbs", ".jar", ".war",
  ".com", ".pif", ".scr", ".hta", ".htaccess",
]);

// Sanitize original filename — remove path traversal and dangerous chars
function sanitizeFilename(filename: string): string {
  return path.basename(filename)
    .replace(/[^a-zA-Z0-9._\-]/g, "_")
    .replace(/\.{2,}/g, "."); // prevent double dots
}

// Check for double extensions (e.g. file.php.jpg)
function hasDoubleExtension(filename: string): boolean {
  const parts = filename.split(".");
  if (parts.length <= 2) return false;
  // Check if any part before the last extension is a dangerous extension
  const allButLast = parts.slice(1, -1);
  return allButLast.some((part) => BLOCKED_EXTENSIONS.has("." + part.toLowerCase()));
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// Multer fileFilter with strict MIME and extension validation
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const sanitized = sanitizeFilename(file.originalname);

  // Check blocked extension
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new Error(`File type '${ext}' is not allowed.`));
  }

  // Check double extension
  if (hasDoubleExtension(sanitized)) {
    return cb(new Error("Files with double extensions are not allowed."));
  }

  // Check MIME type whitelist
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error(`MIME type '${file.mimetype}' is not permitted.`));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB hard limit (reduced from 50MB)
  fileFilter,
});

export class UploadController {
  async uploadFile(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const attachment = {
        name: sanitizeFilename(req.file.originalname),
        mimeType: req.file.mimetype,
        url: `/uploads/${req.file.filename}`,
        size: req.file.size,
      };

      const userId = (req as any).user?.userId;
      auditService.log("FILE_UPLOAD", userId, {
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
      }, req.ip);

      if (userId) {
        const { usageService } = require("../services/usage.service");
        await usageService.incrementUsage(userId, "fileUpload");
      }

      return res.status(200).json({
        success: true,
        attachment,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }
  }
}

export const uploadController = new UploadController();
