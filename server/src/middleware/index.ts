import cors from "cors";
import express, { Application } from "express";
import helmet from "helmet";
import path from "path";
import { apiLimiter } from "./rate-limit.middleware";
import { dbHealthCheck } from "./db-health.middleware";
import { noSQLSanitizer, hppProtection, xssSanitizer } from "./sanitize.middleware";
import { globalErrorHandler, notFoundHandler } from "./error.middleware";

// CORS whitelist — reads from environment variable and CLIENT_URL for flexibility
const allowedOrigins: string[] = [];

const addAllowedOrigin = (originStr?: string) => {
  if (!originStr) return;
  const trimmed = originStr.trim().replace(/\/$/, ""); // trim and strip trailing slash
  if (trimmed && !allowedOrigins.includes(trimmed)) {
    allowedOrigins.push(trimmed);
  }
};

// Populate whitelist
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(",").forEach((o) => addAllowedOrigin(o));
}
addAllowedOrigin(process.env.CLIENT_URL);
addAllowedOrigin("https://champai-theta.vercel.app");

// Fallback defaults for safety in development
addAllowedOrigin("http://localhost:5173");
addAllowedOrigin("http://localhost:3000");

export function applyMiddleware(app: Application): void {
  // 1. Helmet — security headers (CSP, HSTS, X-Frame-Options, etc.)
  const isDevHelmet = process.env.NODE_ENV !== "production";
  app.use(
    helmet({
      // cross-origin in dev so frontend (any localhost port) can read API responses
      crossOriginResourcePolicy: { policy: isDevHelmet ? "cross-origin" : "same-site" },
      contentSecurityPolicy: isDevHelmet ? false : {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
        },
      },
    })
  );


  // 2. CORS — allow all localhost origins in development, strict whitelist in production
  const isDev = process.env.NODE_ENV !== "production";

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (Thunder Client, Postman, server-to-server)
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.trim().replace(/\/$/, "");

        // In development: allow any localhost or 127.0.0.1 origin on any port
        if (isDev && (normalizedOrigin.startsWith("http://localhost") || normalizedOrigin.startsWith("http://127.0.0.1"))) {
          return callback(null, true);
        }

        // In production: enforce strict whitelist
        if (allowedOrigins.includes(normalizedOrigin)) {
          return callback(null, true);
        }

        console.warn(`Blocked by CORS: '${origin}'`);
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 204,
    })
  );


  // 3. Body parsing — reduced limits (10MB max)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // 4. NoSQL injection protection (strips MongoDB operators)
  app.use(noSQLSanitizer);

  // 5. HTTP Parameter Pollution prevention
  app.use(hppProtection);

  // 6. XSS sanitizer
  app.use(xssSanitizer);

  // 7. General API rate limiter (all routes)
  app.use("/api", apiLimiter);

  // 7.5. Database health check (all API routes)
  app.use("/api", dbHealthCheck);

  // 8. Serve uploads statically and publicly
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"))
  );
}

// Register error handlers (must be called AFTER routes are registered)
export function applyErrorHandlers(app: Application): void {
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
}
