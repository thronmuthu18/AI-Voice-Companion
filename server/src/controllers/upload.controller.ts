import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Configure Multer storage engine
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB file size limit
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
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        url: `/uploads/${req.file.filename}`,
        size: req.file.size,
      };

      return res.status(200).json({
        success: true,
        attachment,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to upload file",
      });
    }
  }
}

export const uploadController = new UploadController();
