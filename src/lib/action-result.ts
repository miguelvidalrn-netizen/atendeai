import "server-only";
import type { ZodError } from "zod";
import { AppError, ValidationError, toPublicMessage } from "@/lib/errors";
import { createLogger, newRequestId, type LogContext } from "@/lib/observability/logger";
import { toFieldErrors } from "@/lib/form-errors";

/**
 * Formato único de retorno de toda Server Action.
 *
 * Antes, algumas actions retornavam `{ error }`, outras `void`, e falhas
 * viravam exceção não tratada. Agora toda action passa por `runAction`,
 * que loga o erro completo no servidor e devolve só o que é seguro exibir.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string>;
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  error: string,
  code = "INTERNAL",
  fieldErrors?: Record<string, string>
): ActionResult<never> {
  return { ok: false, error, code, ...(fieldErrors ? { fieldErrors } : {}) };
}

/** Converte um ZodError em ValidationError de domínio. */
export function validationErrorFrom(error: ZodError): ValidationError {
  return new ValidationError(toFieldErrors(error));
}

/**
 * Executa o corpo de uma action com tratamento de erro padronizado.
 *
 * - `redirect()` e `notFound()` do Next lançam erros de controle de fluxo que
 *   DEVEM continuar propagando; eles são re-lançados sem virar resultado.
 * - Erros de domínio viram `{ ok: false }` com mensagem segura.
 * - Erros desconhecidos são logados por inteiro e viram mensagem genérica.
 */
export async function runAction<T>(
  name: string,
  context: LogContext,
  handler: () => Promise<T>
): Promise<ActionResult<T>> {
  const log = createLogger({ requestId: newRequestId(), action: name, ...context });

  try {
    return ok(await handler());
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;

    if (error instanceof ValidationError) {
      return fail(error.publicMessage, error.code, error.fieldErrors);
    }

    if (error instanceof AppError) {
      log.warn("action.failed", { code: error.code, metadata: error.metadata });
      return fail(error.publicMessage, error.code);
    }

    log.error("action.unhandled", error);
    return fail(toPublicMessage(error));
  }
}

/**
 * `redirect()` e `notFound()` sinalizam controle de fluxo via exceção.
 * Capturá-las quebraria a navegação, então são identificadas e re-lançadas.
 */
function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")
  );
}
