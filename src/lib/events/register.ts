import "server-only";
import { subscribeAny } from "./bus";
import { recordAudit } from "@/lib/audit";
import { runAutomationsForEvent } from "@/lib/automations/engine";
import type { AnyDomainEvent, DomainEventName } from "./types";

/**
 * Registro central de assinantes.
 *
 * Quem publica um evento não conhece nenhum destes consumidores. Adicionar
 * um novo comportamento (notificação, webhook, métrica) significa assinar
 * aqui — sem tocar em nenhuma action.
 */

declare global {
  var __atendeaiSubscribersReady: boolean | undefined;
}

/** Eventos que geram rastro de auditoria. */
const AUDITED_EVENTS: DomainEventName[] = [
  "conversation.created",
  "conversation.closed",
  "conversation.handoff_requested",
  "lead.created",
  "lead.status_changed",
  "lead.converted",
  "ai.response_generated",
  "knowledge.updated",
  "product.updated",
];

/** Eventos que podem disparar automações. */
const AUTOMATION_EVENTS: DomainEventName[] = [
  "conversation.created",
  "message.created",
  "lead.created",
  "lead.status_changed",
  "ai.response_generated",
];

function auditHandler(event: AnyDomainEvent) {
  return recordAudit({
    companyId: event.companyId,
    userId: event.actorUserId,
    action: event.name,
    entity: event.name.split(".")[0],
    entityId: extractEntityId(event),
    metadata: event.payload as Record<string, unknown>,
  });
}

function extractEntityId(event: AnyDomainEvent): string | null {
  const payload = event.payload as Record<string, unknown>;
  for (const key of ["leadId", "conversationId", "messageId", "productId", "knowledgeItemId"]) {
    if (typeof payload[key] === "string") return payload[key] as string;
  }
  return null;
}

/**
 * Idempotente: pode ser chamada em qualquer entrypoint sem duplicar
 * assinaturas. Necessário porque módulos são reavaliados em HMR e em
 * diferentes entrypoints serverless.
 */
export function registerEventSubscribers(): void {
  if (globalThis.__atendeaiSubscribersReady) return;
  globalThis.__atendeaiSubscribersReady = true;

  for (const name of AUDITED_EVENTS) {
    subscribeAny(name, auditHandler);
  }

  for (const name of AUTOMATION_EVENTS) {
    subscribeAny(name, runAutomationsForEvent);
  }
}
