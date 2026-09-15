import "server-only";
import { createLogger } from "@/lib/observability/logger";
import type {
  AnyDomainEvent,
  DomainEvent,
  DomainEventName,
  EventHandler,
} from "./types";

/**
 * Event bus em processo.
 *
 * Deliberadamente NÃO é um sistema distribuído: é um despachante síncrono
 * server-side que desacopla quem publica de quem consome. Trocar por SQS,
 * Inngest ou QStash no futuro significa reimplementar `publish` — nenhum
 * publisher precisa mudar.
 *
 * Garantias:
 * - um handler que falha não derruba os outros nem a request que publicou;
 * - eventos já processados são ignorados (dedupe por id), tornando o
 *   despacho idempotente em caso de retry.
 */

type Registry = Map<DomainEventName, Set<EventHandler<never>>>;

type BusState = {
  handlers: Registry;
  processed: Set<string>;
};

declare global {
  var __atendeaiEventBus: BusState | undefined;
}

// O HMR do Next reavalia módulos; sem isso, handlers seriam registrados
// várias vezes e cada evento rodaria em duplicata durante o desenvolvimento.
const state: BusState = globalThis.__atendeaiEventBus ?? {
  handlers: new Map(),
  processed: new Set(),
};

if (process.env.NODE_ENV !== "production") {
  globalThis.__atendeaiEventBus = state;
}

const log = createLogger({ action: "event-bus" });

/** Limite do cache de dedupe, para não crescer indefinidamente. */
const MAX_PROCESSED = 2000;

export function subscribe<N extends DomainEventName>(
  name: N,
  handler: EventHandler<N>
): () => void {
  const existing = state.handlers.get(name) ?? new Set();
  existing.add(handler as EventHandler<never>);
  state.handlers.set(name, existing);

  return () => {
    existing.delete(handler as EventHandler<never>);
  };
}

/**
 * Publica um evento para todos os assinantes.
 *
 * Os handlers rodam em sequência e cada um é isolado em try/catch: uma
 * automação quebrada nunca impede a auditoria de gravar, nem faz a action
 * original falhar.
 */
export async function publish(event: AnyDomainEvent): Promise<void> {
  if (state.processed.has(event.id)) {
    log.debug("event.duplicate_ignored", { eventId: event.id, name: event.name });
    return;
  }

  state.processed.add(event.id);
  if (state.processed.size > MAX_PROCESSED) {
    // Descarta os mais antigos (Set preserva ordem de inserção).
    const excess = state.processed.size - MAX_PROCESSED;
    let removed = 0;
    for (const id of state.processed) {
      state.processed.delete(id);
      if (++removed >= excess) break;
    }
  }

  const handlers = state.handlers.get(event.name);
  if (!handlers?.size) return;

  const eventLog = log.child({ companyId: event.companyId });

  for (const handler of handlers) {
    try {
      await (handler as EventHandler)(event as DomainEvent);
    } catch (error) {
      eventLog.error("event.handler_failed", error, {
        eventName: event.name,
        eventId: event.id,
      });
    }
  }
}

/** Publica sem aguardar os handlers — para caminhos sensíveis a latência. */
export function publishAsync(event: AnyDomainEvent): void {
  void publish(event);
}

export function registeredEventNames(): DomainEventName[] {
  return [...state.handlers.keys()];
}

/**
 * Assina um evento com um handler genérico (recebe qualquer DomainEvent).
 * Usado no registro em massa, onde o nome do evento vem de um array e a
 * inferência de tipo por evento específico não se aplica.
 */
export function subscribeAny(
  name: DomainEventName,
  handler: (event: AnyDomainEvent) => Promise<void> | void
): () => void {
  const existing = state.handlers.get(name) ?? new Set();
  existing.add(handler as EventHandler<never>);
  state.handlers.set(name, existing);

  return () => {
    existing.delete(handler as EventHandler<never>);
  };
}
