const isServer = typeof window === "undefined";

let appendFileSync: any = null;
let existsSync: any = null;
let mkdirSync: any = null;
let joinPath: any = null;
let activeLogDir: string | null = null;

// Only import fs modules on the server
if (isServer) {
  const fsModule = require("fs");
  const pathModule = require("path");
  appendFileSync = fsModule.appendFileSync;
  existsSync = fsModule.existsSync;
  mkdirSync = fsModule.mkdirSync;
  joinPath = pathModule.join;
}

const PREFERRED_LOG_DIR =
  isServer && joinPath ? joinPath(process.cwd(), "logs") : "";
const FALLBACK_LOG_DIR = "/tmp/voice-agent-logs";

// Ensure a writable log directory exists on server without throwing
if (isServer && existsSync && mkdirSync) {
  const candidates = [PREFERRED_LOG_DIR, FALLBACK_LOG_DIR].filter(Boolean);

  for (const dir of candidates) {
    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      activeLogDir = dir;
      break;
    } catch {
      continue;
    }
  }
}

function getTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

function formatMessage(level: string, message: string, data?: any): string {
  const timestamp = getTimestamp();
  let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (data) {
    if (typeof data === "string") {
      logMessage += ` ${data}`;
    } else {
      logMessage += ` ${JSON.stringify(data)}`;
    }
  }

  return logMessage;
}

function writeToFile(message: string, level: string): void {
  if (!isServer || !activeLogDir || !appendFileSync) return;

  try {
    const logFile = `${activeLogDir}/app-${new Date().toISOString().split("T")[0]}.log`;
    appendFileSync(logFile, message + "\n", "utf8");
  } catch (error) {
    // Fail silently to avoid breaking the app
  }
}

function logToClient(level: string, message: string, data?: any): void {
  if (isServer) return;

  try {
    const logMessage = formatMessage(level, message, data);
    const logs = JSON.parse(localStorage.getItem("app_logs") || "[]");
    logs.push(logMessage);
    // Keep only last 500 logs in localStorage
    if (logs.length > 500) {
      logs.shift();
    }
    localStorage.setItem("app_logs", JSON.stringify(logs));
  } catch (error) {
    // Fail silently
  }
}

export const logger = {
  log(message: string, data?: any) {
    const formatted = formatMessage("log", message, data);
    if (isServer) {
      writeToFile(formatted, "log");
    } else {
      logToClient("log", message, data);
    }
  },

  info(message: string, data?: any) {
    const formatted = formatMessage("info", message, data);
    if (isServer) {
      writeToFile(formatted, "info");
    } else {
      logToClient("info", message, data);
    }
  },

  warn(message: string, data?: any) {
    const formatted = formatMessage("warn", message, data);
    if (isServer) {
      writeToFile(formatted, "warn");
    } else {
      logToClient("warn", message, data);
    }
  },

  error(message: string, data?: any) {
    const formatted = formatMessage("error", message, data);
    if (isServer) {
      writeToFile(formatted, "error");
    } else {
      logToClient("error", message, data);
    }
  },

  debug(message: string, data?: any) {
    const formatted = formatMessage("debug", message, data);
    if (isServer) {
      writeToFile(formatted, "debug");
    } else {
      logToClient("debug", message, data);
    }
  },
};
