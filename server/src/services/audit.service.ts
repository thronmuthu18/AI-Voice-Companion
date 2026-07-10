import fs from "fs";
import path from "path";

export type AuditEventType =
  | "REGISTER"
  | "LOGIN"
  | "LOGOUT"
  | "LOGOUT_ALL"
  | "FAILED_LOGIN"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_CHANGE"
  | "FILE_UPLOAD"
  | "IMAGE_GENERATION"
  | "IMAGE_EDIT"
  | "VISION_REQUEST"
  | "DOCUMENT_ANALYSIS"
  | "SECURITY_EVENT";

export interface AuditEntry {
  timestamp: string;
  event: AuditEventType;
  userId?: string;
  ip?: string;
  meta?: Record<string, any>;
}

class AuditService {
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), "logs");
    this.logFile = path.join(this.logDir, "audit.log");
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private scrubSecrets(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    const keysToBlock = ["password", "key", "secret", "token"];
    if (Array.isArray(obj)) {
      return obj.map((item) => this.scrubSecrets(item));
    }
    const scrubbed: any = {};
    for (const key of Object.keys(obj)) {
      const isDangerous = keysToBlock.some((blocked) => key.toLowerCase().includes(blocked));
      if (isDangerous) {
        scrubbed[key] = "[REDACTED]";
      } else {
        scrubbed[key] = this.scrubSecrets(obj[key]);
      }
    }
    return scrubbed;
  }

  log(event: AuditEventType, userId?: string, meta?: Record<string, any>, ip?: string): void {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event,
      userId,
      ip,
      meta: meta ? this.scrubSecrets(meta) : undefined,
    };

    const line = JSON.stringify(entry) + "\n";

    // Write to audit log file asynchronously (non-blocking)
    fs.appendFile(this.logFile, line, (err) => {
      if (err) {
        console.error("[AuditService] Failed to write audit log:", err.message);
      }
    });

    // Also echo critical security events to console
    if (["FAILED_LOGIN", "ACCOUNT_LOCKED", "SECURITY_EVENT"].includes(event)) {
      console.warn(`[SECURITY AUDIT] ${event} | userId=${userId ?? "unknown"} | ip=${ip ?? "unknown"} | ${JSON.stringify(entry.meta ?? {})}`);
    }
  }
}

export const auditService = new AuditService();
