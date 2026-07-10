import { Request, Response, NextFunction } from "express";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { filterXSS } from "xss";

// NoSQL injection protection — strips MongoDB operators ($where, $gt, etc.) from user input
export const noSQLSanitizer = mongoSanitize({
  replaceWith: "_",
  allowDots: true,
});

// HTTP Parameter Pollution prevention
export const hppProtection = hpp();

// Recursively sanitize string values in an object against XSS
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return filterXSS(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

// XSS sanitizer middleware — cleans req.body, req.query, req.params
export function xssSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}
