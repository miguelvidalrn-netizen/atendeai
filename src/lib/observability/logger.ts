import "server-only";
import { isAppError } from "@/lib/errors";

/**
 * Logging estruturado (JSON em uma linha) para que qualquer coletor futuro
 * — Vercel Logs, Datadog, Axiom — consiga indexar sem parser customizado.
 * Nenhuma plataforma externa é usada aqui.
 */

export type LogContext = {
  requestId?: string;
  companyId?: string;
  userId?: string;
  conversationId?: string;
  action?: string;
  provider?: string;
  agent?: string;
  tool?: string;
};

type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Chaves que nunca podem ser gravadas em log, mesmo se alguém as passar
 * por engano dentro de `data`. A checagem é por substring case-insensitive.
 */
const REDACTED_KEYS = [
  "password",
  "passwordhash",
  "senha",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "databaseurl",
  "database_url",
  "connectionstring",
];

const REDACTED = "[REDACTED]";

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_\s]/g, "");
  return REDACTED_KEYS.some((forbidden) =>
    normalized.includes(forbidden.replace(/[-_]/g, ""))
  );
}

/** Remove valores sensíveis recursivamente antes de serializar. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH]";
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redact(item, depth + 1));
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = shouldRedact(key) ? REDACTED : redact(item, depth + 1);
    }
    return output;
  }

  return value;
}

function emit(
  level: LogLevel,
  message: string,
  context: LogContext,
  data?: Record<string, unknown>
) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
    ...(data ? { data: redact(data) } : {}),
  };

  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export type Logger = {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: unknown, data?: Record<string, unknown>): void;
  /** Cria um logger filho herdando o contexto atual. */
  child(context: LogContext): Logger;
};

export function createLogger(context: LogContext = {}): Logger {
  return {
    debug(message, data) {
      if (process.env.NODE_ENV !== "production") emit("debug", message, context, data);
    },
    info(message, data) {
      emit("info", message, context, data);
    },
    warn(message, data) {
      emit("warn", message, context, data);
    },
    error(message, error, data) {
      emit("error", message, context, {
        ...data,
        error: isAppError(error)
          ? { name: error.name, code: error.code, message: error.message }
          : error instanceof Error
            ? { name: error.name, message: error.message }
            : error,
      });
    },
    child(childContext) {
      return createLogger({ ...context, ...childContext });
    },
  };
}

export const logger = createLogger();

/** Identificador curto para correlacionar logs de uma mesma operação. */
export function newRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}
