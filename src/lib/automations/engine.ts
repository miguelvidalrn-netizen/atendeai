import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { automations, conversations, leads } from "@/db/schema";
import { createLogger } from "@/lib/observability/logger";
import { recordAudit } from "@/lib/audit";
import type { AnyDomainEvent } from "@/lib/events/types";
import {
  automationActionSchema,
  automationConditionSchema,
  type AutomationAction,
  type AutomationCondition,
} from "./types";

const log = createLogger({ action: "automation-engine" });

/** Lê um caminho com pontos dentro do payload, sem lançar. */
function readPath(source: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((current, segment) => {
      if (current && typeof current === "object" && segment in current) {
        return (current as Record<string, unknown>)[segment];
      }
      return undefined;
    }, source);
}

export function evaluateCondition(
  condition: AutomationCondition,
  payload: unknown
): boolean {
  const actual = readPath(payload, condition.path);
  const expected = condition.value;

  switch (condition.operator) {
    case "exists":
      return actual !== undefined && actual !== null;
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "contains":
      return (
        typeof actual === "string" &&
        typeof expected === "string" &&
        actual.toLowerCase().includes(expected.toLowerCase())
      );
    case "gt":
      return Number(actual) > Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    default:
      return false;
  }
}

/**
 * Executa uma ação de automação.
 *
 * MULTI-TENANT: toda escrita filtra por `companyId` vindo do evento — que por
 * sua vez veio da sessão do servidor no momento da publicação. Uma automação
 * de uma empresa não consegue alterar dados de outra mesmo que o payload
 * contenha um id externo.
 */
async function executeAction(
  action: AutomationAction,
  event: AnyDomainEvent
): Promise<void> {
  const { companyId } = event;
  const payload = event.payload as Record<string, unknown>;

  switch (action.type) {
    case "lead.update_status": {
      const leadId = payload.leadId;
      if (typeof leadId !== "string") return;

      await db
        .update(leads)
        .set({ status: action.status, updatedAt: new Date() })
        .where(and(eq(leads.id, leadId), eq(leads.companyId, companyId)));
      return;
    }

    case "conversation.request_handoff": {
      const conversationId = payload.conversationId;
      if (typeof conversationId !== "string") return;

      await db
        .update(conversations)
        .set({
          handoffRequested: true,
          handoffReason: action.reason ?? "Solicitado por automação",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.companyId, companyId)
          )
        );
      return;
    }

    case "audit.note": {
      await recordAudit({
        companyId,
        userId: event.actorUserId,
        action: "automation.note",
        entity: "automation",
        metadata: { note: action.note, triggeredBy: event.name },
      });
      return;
    }
  }
}

/**
 * Processa um evento contra as automações ativas da empresa.
 * Registrado como assinante do bus — não é chamado diretamente pelas actions.
 */
export async function runAutomationsForEvent(
  event: AnyDomainEvent
): Promise<void> {
  const rules = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.companyId, event.companyId),
        eq(automations.trigger, event.name),
        eq(automations.enabled, true)
      )
    );

  if (rules.length === 0) return;

  for (const rule of rules) {
    try {
      // O conteúdo vem de jsonb: revalidar antes de executar.
      const conditions = automationConditionSchema
        .array()
        .safeParse(rule.conditions);
      const actions = automationActionSchema.array().safeParse(rule.actions);

      if (!conditions.success || !actions.success) {
        log.warn("automation.invalid_definition", {
          automationId: rule.id,
          companyId: event.companyId,
        });
        continue;
      }

      const matches = conditions.data.every((condition) =>
        evaluateCondition(condition, event.payload)
      );
      if (!matches) continue;

      for (const action of actions.data) {
        await executeAction(action, event);
      }

      log.info("automation.executed", {
        automationId: rule.id,
        trigger: event.name,
        actionCount: actions.data.length,
      });
    } catch (error) {
      // Uma regra quebrada não impede as demais de rodar.
      log.error("automation.failed", error, { automationId: rule.id });
    }
  }
}
