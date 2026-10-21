import fs from "fs";
import path from "path";

export type LogLevel = "DEBUG" | "INFO" | "HTTP" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  scope?: string;
  message: string;
  meta?: unknown;
}

export interface ScopedLogger {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
  http: (message: string, meta?: unknown) => void;
  debug: (message: string, meta?: unknown) => void;
}

// Ensure the logs directory exists
const LOG_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create logs directory:", err);
  }
}

// Sensitive field keys to redact
const SENSITIVE_KEYS = [
  "password",
  "passwordconfirmation",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "secret",
  "creditcard",
  "cardnumber",
  "cvv",
  "otp",
];

/**
 * Deep sanitization of objects to mask sensitive data like passwords and tokens
 */
export function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (data instanceof Error) {
    return {
      message: data.message,
      name: data.name,
      stack: data.stack,
    };
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z]/g, "");
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format Date as YYYY-MM-DD
 */
function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format Date as YYYY-MM-DD HH:mm:ss.SSS
 */
function getLocalTimestamp(date = new Date()): string {
  const dateStr = getLocalDateString(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${dateStr} ${hours}:${minutes}:${seconds}.${ms}`;
}

// Terminal color codes
const COLORS = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

/**
 * Colorize terminal logs based on log level
 */
function getLevelColor(level: LogLevel): string {
  switch (level) {
    case "DEBUG":
      return COLORS.gray;
    case "INFO":
      return COLORS.green;
    case "HTTP":
      return COLORS.cyan;
    case "WARN":
      return COLORS.yellow;
    case "ERROR":
      return COLORS.red;
    default:
      return COLORS.reset;
  }
}

/**
 * Write log entry to files and terminal
 */
function writeLog(
  level: LogLevel,
  message: string,
  meta?: unknown,
  scope: string = "SERVER",
) {
  const now = new Date();
  const timestamp = getLocalTimestamp(now);
  const dateStr = getLocalDateString(now);

  const sanitizedMeta = meta !== undefined ? sanitizeData(meta) : undefined;

  let metaString = "";
  if (sanitizedMeta !== undefined) {
    try {
      metaString =
        typeof sanitizedMeta === "string"
          ? sanitizedMeta
          : JSON.stringify(sanitizedMeta);
    } catch {
      metaString = String(sanitizedMeta);
    }
  }

  // File log line format:
  // [2026-10-21 14:30:00.123] [INFO] [AUTH] User login successful {"email":"..."}
  const fileLogLine = `[${timestamp}] [${level.padEnd(5)}] [${scope}] ${message}${
    metaString ? ` | ${metaString}` : ""
  }\n`;

  // Terminal log line format (with colors):
  const color = getLevelColor(level);
  const terminalLogLine = `${COLORS.gray}[${timestamp}]${COLORS.reset} ${color}${COLORS.bold}[${level.padEnd(5)}]${COLORS.reset} ${COLORS.magenta}[${scope}]${COLORS.reset} ${message}${
    metaString ? ` ${COLORS.gray}| ${metaString}${COLORS.reset}` : ""
  }`;

  // Print to stdout / stderr
  if (level === "ERROR") {
    console.error(terminalLogLine);
  } else if (level === "WARN") {
    console.warn(terminalLogLine);
  } else {
    console.log(terminalLogLine);
  }

  // Asynchronous append to log files
  const combinedLogPath = path.join(LOG_DIR, `server-${dateStr}.log`);
  fs.appendFile(combinedLogPath, fileLogLine, (err) => {
    if (err) {
      console.error(`Failed to write to combined log file: ${combinedLogPath}`, err);
    }
  });

  // Also write warnings and errors to dedicated error log file
  if (level === "ERROR" || level === "WARN") {
    const errorLogPath = path.join(LOG_DIR, `error-${dateStr}.log`);
    fs.appendFile(errorLogPath, fileLogLine, (err) => {
      if (err) {
        console.error(`Failed to write to error log file: ${errorLogPath}`, err);
      }
    });
  }
}

export const logger = {
  info: (message: string, meta?: unknown, scope: string = "SERVER") =>
    writeLog("INFO", message, meta, scope),
  warn: (message: string, meta?: unknown, scope: string = "SERVER") =>
    writeLog("WARN", message, meta, scope),
  error: (message: string, meta?: unknown, scope: string = "SERVER") =>
    writeLog("ERROR", message, meta, scope),
  http: (message: string, meta?: unknown, scope: string = "SERVER") =>
    writeLog("HTTP", message, meta, scope),
  debug: (message: string, meta?: unknown, scope: string = "SERVER") =>
    writeLog("DEBUG", message, meta, scope),

  /**
   * Create a scoped logger instance tagged with a specific route or module name
   * Example: const authLog = logger.scope("AUTH");
   * authLog.info("User registered", { email });
   */
  scope: (scopeName: string): ScopedLogger => ({
    info: (message: string, meta?: unknown) =>
      writeLog("INFO", message, meta, scopeName),
    warn: (message: string, meta?: unknown) =>
      writeLog("WARN", message, meta, scopeName),
    error: (message: string, meta?: unknown) =>
      writeLog("ERROR", message, meta, scopeName),
    http: (message: string, meta?: unknown) =>
      writeLog("HTTP", message, meta, scopeName),
    debug: (message: string, meta?: unknown) =>
      writeLog("DEBUG", message, meta, scopeName),
  }),
};

export default logger;
