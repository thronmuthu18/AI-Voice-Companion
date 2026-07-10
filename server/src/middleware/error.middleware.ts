import { Request, Response, NextFunction } from "express";
import { auditService } from "../services/audit.service";

// Production-safe global error handler — strips stack traces and internal details
export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProd = process.env.NODE_ENV === "production";

  // Log full error internally
  console.error("[GlobalErrorHandler]", err);

  // 1. Handle malformed JSON syntax errors
  if (err instanceof SyntaxError && "status" in err && (err as any).status === 400 && "body" in err) {
    auditService.log("SECURITY_EVENT" as any, undefined, {
      reason: "invalid_json_payload",
      message: err.message,
    }, req.ip);

    res.status(400).json({
      success: false,
      message: "Invalid JSON payload. Please verify request body formatting.",
    });
    return;
  }

  // 2. Handle body-parser payload limit exceeded (Oversized payload)
  if (err.type === "entity.too.large" || err.status === 413) {
    auditService.log("SECURITY_EVENT" as any, undefined, {
      reason: "oversized_payload",
      limit: err.limit,
    }, req.ip);

    res.status(413).json({
      success: false,
      message: "Payload too large. Maximum body size limit is 10MB.",
    });
    return;
  }

  // 3. Handle Multer file upload validation errors (Size limit / Type validation)
  if (err.code === "LIMIT_FILE_SIZE") {
    auditService.log("SECURITY_EVENT" as any, undefined, {
      reason: "upload_validation_failure",
      detail: "file_size_limit_exceeded",
    }, req.ip);

    res.status(400).json({
      success: false,
      message: "File upload failed: File size exceeds the maximum limit of 20MB.",
    });
    return;
  }

  if (err.message && (
    err.message.includes("not allowed") ||
    err.message.includes("not permitted") ||
    err.message.includes("double extensions")
  )) {
    auditService.log("SECURITY_EVENT" as any, undefined, {
      reason: "upload_validation_failure",
      detail: err.message,
    }, req.ip);

    res.status(400).json({
      success: false,
      message: `File upload failed: ${err.message}`,
    });
    return;
  }

  // General Status Code
  const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;

  const safeMessage = isProd
    ? statusCode === 500
      ? "An internal server error occurred. Please try again later."
      : err.message || "An error occurred."
    : err.message || "An error occurred.";

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
