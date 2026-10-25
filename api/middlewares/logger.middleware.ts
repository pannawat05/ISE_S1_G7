import type { Request, Response, NextFunction } from "express";
import { logger, type ScopedLogger } from "../lib/logger.js";
import type { AuthRequest } from "./types.js";

/**
 * Express middleware to automatically log all incoming HTTP requests and responses
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  req.startTime = startTime;

  // Initialize a default scoped logger for the request
  if (!req.log) {
    req.log = logger.scope("HTTP");
  }

  // Hook into response finish event
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Determine client IP
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : null) ||
      req.socket.remoteAddress ||
      req.ip ||
      "unknown";

    // Check if authenticated user info is attached
    const authReq = req as AuthRequest;
    const userInfo = authReq.user ? `ID: ${authReq.user.id}` : undefined;

    // Log payload metadata
    const meta: Record<string, unknown> = {
      method,
      url,
      status: statusCode,
      duration: `${duration}ms`,
      ip,
    };

    if (userInfo) {
      meta.user = userInfo;
    }

    if (req.query && Object.keys(req.query).length > 0) {
      meta.query = req.query;
    }

    // Only attach body for state-changing methods (avoid large GET payloads if any)
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && req.body) {
      meta.body = req.body;
    }

    const logMessage = `${method} ${url} ${statusCode} - ${duration}ms${
      userInfo ? ` | User: ${userInfo}` : ""
    } | IP: ${ip}`;

    const currentLogger = req.log || logger;

    if (statusCode >= 500) {
      currentLogger.error(logMessage, meta);
    } else if (statusCode >= 400) {
      currentLogger.warn(logMessage, meta);
    } else {
      currentLogger.http(logMessage, meta);
    }
  });

  next();
}

/**
 * Create a route-level middleware to tag all logs in that route module
 * Example: router.use(createRouteLogger("AUTH"));
 */
export function createRouteLogger(scopeName: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.log = logger.scope(scopeName);
    next();
  };
}

/**
 * Express error logger middleware (handles uncaught route errors)
 */
export function errorLogger(
  err: unknown,
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const method = req.method;
  const url = req.originalUrl || req.url;
  const errMsg = err instanceof Error ? err.message : String(err);

  logger.error(
    `Unhandled error on ${method} ${url}: ${errMsg}`,
    {
      error: err,
      method,
      url,
      ip: req.ip,
      body: req.body,
    },
    "ERROR_HANDLER",
  );

  next(err);
}
