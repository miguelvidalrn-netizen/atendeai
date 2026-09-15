/**
 * Erros de domínio do AtendeAI.
 *
 * Regra central: `publicMessage` é a ÚNICA parte que pode chegar ao usuário.
 * `message` e `cause` ficam nos logs do servidor. Nenhum erro carrega segredo,
 * query bruta ou detalhe de infraestrutura para a UI.
 *
 * Este módulo é isomórfico de propósito (sem `server-only`): os tipos de
 * código de erro são usados na UI para decidir o que exibir.
 */

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "FEATURE_DISABLED"
  | "LIMIT_REACHED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly publicMessage: string;
  readonly metadata?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    publicMessage: string,
    options?: { message?: string; cause?: unknown; metadata?: Record<string, unknown> }
  ) {
    super(options?.message ?? publicMessage, { cause: options?.cause });
    this.name = new.target.name;
    this.code = code;
    this.publicMessage = publicMessage;
    this.metadata = options?.metadata;
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: Record<string, string>;

  constructor(
    fieldErrors: Record<string, string> = {},
    publicMessage = "Verifique os campos destacados."
  ) {
    super("VALIDATION", publicMessage);
    this.fieldErrors = fieldErrors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message?: string) {
    super("UNAUTHORIZED", "Você precisa entrar para continuar.", { message });
  }
}

export class ForbiddenError extends AppError {
  constructor(message?: string) {
    super("FORBIDDEN", "Você não tem permissão para esta ação.", { message });
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Registro", message?: string) {
    super("NOT_FOUND", `${entity} não encontrado.`, { message });
  }
}

export class ConflictError extends AppError {
  constructor(publicMessage: string, message?: string) {
    super("CONFLICT", publicMessage, { message });
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("RATE_LIMITED", "Muitas tentativas. Aguarde um instante e tente de novo.");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Falha em integração externa (LLM, pagamento, canal). Detalhe nunca vaza. */
export class ProviderError extends AppError {
  constructor(provider: string, cause?: unknown) {
    super("PROVIDER_ERROR", "Serviço temporariamente indisponível. Tente de novo.", {
      message: `Falha no provedor "${provider}".`,
      cause,
      metadata: { provider },
    });
  }
}

export class FeatureDisabledError extends AppError {
  constructor(feature: string) {
    super("FEATURE_DISABLED", "Este recurso não está disponível no seu plano.", {
      message: `Feature "${feature}" desabilitada.`,
      metadata: { feature },
    });
  }
}

export class LimitReachedError extends AppError {
  constructor(publicMessage: string, metadata?: Record<string, unknown>) {
    super("LIMIT_REACHED", publicMessage, { metadata });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Converte qualquer erro em uma mensagem segura para o usuário.
 * Erros desconhecidos viram mensagem genérica — nunca `error.message` cru,
 * que pode conter string de conexão, caminho de arquivo ou chave.
 */
export function toPublicMessage(error: unknown): string {
  if (isAppError(error)) return error.publicMessage;
  return "Algo deu errado. Tente novamente em instantes.";
}
