import type { ZodError } from "zod";

export type FieldErrors = Record<string, string>;

/**
 * Converte os issues de um ZodError em um mapa simples campo -> mensagem.
 * O Zod 4 tipa `issue.path` como `PropertyKey[]`, por isso a conversão para
 * string é feita aqui em um único lugar.
 */
export function toFieldErrors(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}
