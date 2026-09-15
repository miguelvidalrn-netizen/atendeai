/**
 * Eventos de domínio.
 *
 * Todo evento carrega `companyId` — é o que permite que consumidores
 * (auditoria, automações) façam seu trabalho sem nunca precisar adivinhar
 * o tenant nem recebê-lo do cliente.
 */

export type DomainEventName =
  | "conversation.created"
  | "conversation.closed"
  | "conversation.handoff_requested"
  | "message.created"
  | "lead.created"
  | "lead.status_changed"
  | "lead.converted"
  | "ai.response_generated"
  | "knowledge.updated"
  | "product.updated";

type EventPayloads = {
  "conversation.created": {
    conversationId: string;
    customerName: string;
    channel: string;
  };
  "conversation.closed": { conversationId: string };
  "conversation.handoff_requested": {
    conversationId: string;
    reason: string | null;
  };
  "message.created": {
    conversationId: string;
    messageId: string;
    sender: "CLIENTE" | "EMPRESA" | "IA";
  };
  "lead.created": {
    leadId: string;
    name: string;
    status: string;
    conversationId?: string | null;
  };
  "lead.status_changed": {
    leadId: string;
    from: string;
    to: string;
  };
  "lead.converted": { leadId: string; estimatedValue: string | null };
  "ai.response_generated": {
    conversationId: string;
    agent: string;
    provider: string;
    isReal: boolean;
    toolsUsed: string[];
  };
  "knowledge.updated": { knowledgeItemId: string; operation: string };
  "product.updated": { productId: string; operation: string };
};

export type DomainEvent<N extends DomainEventName = DomainEventName> = {
  /** Id único do evento — usado para deduplicação em consumidores. */
  id: string;
  name: N;
  companyId: string;
  /** Usuário que originou. Nulo quando a origem é o sistema (IA/automação). */
  actorUserId: string | null;
  occurredAt: Date;
  payload: EventPayloads[N];
};

export type AnyDomainEvent = {
  [N in DomainEventName]: DomainEvent<N>;
}[DomainEventName];

export type EventHandler<N extends DomainEventName = DomainEventName> = (
  event: DomainEvent<N>
) => Promise<void> | void;

export function createEvent<N extends DomainEventName>(
  name: N,
  companyId: string,
  payload: EventPayloads[N],
  actorUserId: string | null = null
): DomainEvent<N> {
  return {
    id: crypto.randomUUID(),
    name,
    companyId,
    actorUserId,
    occurredAt: new Date(),
    payload,
  };
}
