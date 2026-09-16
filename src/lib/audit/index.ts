import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { createLogger, redact } from "@/lib/observability/logger";

const log = createLogger({ action: "audit" });

export type AuditEntry = {
  companyId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Grava uma entrada de auditoria.
 *
 * O metadata passa pelo mesmo redator do logger antes de ir ao banco: senha,
 * token, chave de API e string de conexão nunca são persistidos, mesmo que
 * cheguem por engano.
 *
 * Falha em auditoria NUNCA quebra a operação de negócio — apenas loga.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      companyId: entry.companyId,
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata
        ? (redact(entry.metadata) as Record<string, unknown>)
        : null,
    });
  } catch (error) {
    log.error("audit.write_failed", error, {
      auditAction: entry.action,
      entity: entry.entity,
    });
  }
}

/** Lista o rastro de auditoria de uma empresa. Requer permissão audit:read. */
export async function listAuditLogs(companyId: string, limit = 100) {
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.companyId, companyId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/**
 * Histórico de um tipo de entidade inteiro (ex: todos os leads), agrupável
 * no chamador por `entityId`. Uma única query evita N+1 ao montar o
 * histórico de várias entidades na mesma tela (ex: o board de leads).
 */
export async function listAuditLogsByEntity(
  companyId: string,
  entity: string,
  limit = 300
) {
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.companyId, companyId), eq(auditLogs.entity, entity)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
