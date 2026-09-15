import "server-only";
import { publish } from "./bus";
import { registerEventSubscribers } from "./register";
import { createEvent } from "./types";
import type { AnyDomainEvent, DomainEvent, DomainEventName } from "./types";

export type { DomainEvent, DomainEventName, AnyDomainEvent };
export { createEvent };

/**
 * Ponto único de publicação usado pelas actions.
 *
 * Garante que os assinantes estejam registrados antes do despacho — em
 * ambiente serverless a instância pode ser nova a cada invocação, e um
 * evento publicado antes do registro seria perdido silenciosamente.
 */
export async function emit<N extends DomainEventName>(
  name: N,
  companyId: string,
  payload: DomainEvent<N>["payload"],
  actorUserId: string | null = null
): Promise<void> {
  registerEventSubscribers();
  await publish(createEvent(name, companyId, payload, actorUserId) as AnyDomainEvent);
}
