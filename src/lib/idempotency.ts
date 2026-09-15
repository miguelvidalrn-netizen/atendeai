import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { idempotencyKeys } from "@/db/schema";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger({ action: "idempotency" });

/**
 * Executa uma operação no máximo uma vez por (companyId, scope, key).
 *
 * A garantia real vem do índice único no banco, não de um `select` prévio:
 * dois cliques simultâneos entram os dois no `insert`, e apenas um sobrevive.
 * O outro recebe violação de unicidade e reaproveita o resultado existente.
 *
 * Retorna `{ entityId, replayed }` — `replayed: true` significa que a
 * operação já havia acontecido e nada novo foi criado.
 */
export async function withIdempotency(
  params: { companyId: string; scope: string; key: string },
  operation: () => Promise<string>
): Promise<{ entityId: string; replayed: boolean }> {
  const { companyId, scope, key } = params;

  const existing = await findKey(companyId, scope, key);
  if (existing?.entityId) {
    log.info("idempotency.replayed", { scope, companyId });
    return { entityId: existing.entityId, replayed: true };
  }

  try {
    // Reserva a chave ANTES de executar. Se outra requisição concorrente já
    // reservou, o índice único rejeita aqui e caímos no catch.
    await db.insert(idempotencyKeys).values({ companyId, scope, key });
  } catch {
    const concurrent = await findKey(companyId, scope, key);
    if (concurrent?.entityId) {
      return { entityId: concurrent.entityId, replayed: true };
    }
    // Reservada mas ainda sem resultado: a outra execução está em andamento.
    log.warn("idempotency.in_flight", { scope, companyId });
    throw new Error("Operação já em andamento. Tente novamente em instantes.");
  }

  try {
    const entityId = await operation();

    await db
      .update(idempotencyKeys)
      .set({ entityId })
      .where(
        and(
          eq(idempotencyKeys.companyId, companyId),
          eq(idempotencyKeys.scope, scope),
          eq(idempotencyKeys.key, key)
        )
      );

    return { entityId, replayed: false };
  } catch (error) {
    // A operação falhou: libera a chave para permitir nova tentativa.
    await db
      .delete(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.companyId, companyId),
          eq(idempotencyKeys.scope, scope),
          eq(idempotencyKeys.key, key)
        )
      )
      .catch(() => undefined);

    throw error;
  }
}

async function findKey(companyId: string, scope: string, key: string) {
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.companyId, companyId),
        eq(idempotencyKeys.scope, scope),
        eq(idempotencyKeys.key, key)
      )
    )
    .limit(1);

  return row ?? null;
}

/**
 * Deriva uma chave estável a partir do conteúdo da operação.
 * Usada quando o cliente não envia uma chave explícita: dois envios
 * idênticos em sequência produzem a mesma chave e são deduplicados.
 */
export function deriveKey(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join("|").slice(0, 200);
}
