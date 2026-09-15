import "server-only";
import { createLogger } from "@/lib/observability/logger";

/**
 * Adapters de integração externa.
 *
 * NENHUMA integração real é implementada nesta fase. O que existe aqui são
 * os contratos e implementações "noop" que registram a intenção e falham de
 * forma explícita quando chamadas sem configuração.
 *
 * O ganho é de fronteira: o domínio já pode chamar `getChannelProvider()`
 * sem saber se por trás existe WhatsApp Cloud API, Twilio ou nada.
 */

const log = createLogger({ action: "providers" });

export type OutboundMessage = {
  to: string;
  content: string;
  conversationId: string;
};

export interface ChannelProvider {
  readonly name: string;
  readonly channel: "WHATSAPP" | "INSTAGRAM";
  readonly configured: boolean;
  send(message: OutboundMessage): Promise<{ externalId: string | null }>;
}

export interface EmailProvider {
  readonly name: string;
  readonly configured: boolean;
  send(input: { to: string; subject: string; body: string }): Promise<void>;
}

export interface StorageProvider {
  readonly name: string;
  readonly configured: boolean;
  /** URL assinada para upload direto — nunca expõe credencial ao cliente. */
  createUploadUrl(input: {
    companyId: string;
    filename: string;
    contentType: string;
  }): Promise<{ uploadUrl: string; publicUrl: string }>;
}

export type CheckoutSession = { url: string; externalId: string };

export interface PaymentProvider {
  readonly name: string;
  readonly configured: boolean;
  createCheckoutSession(input: {
    companyId: string;
    plan: string;
  }): Promise<CheckoutSession>;
}

class NotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Provider "${provider}" não está configurado neste ambiente.`);
  }
}

class NoopChannelProvider implements ChannelProvider {
  readonly configured = false;
  constructor(
    readonly name: string,
    readonly channel: "WHATSAPP" | "INSTAGRAM"
  ) {}

  async send(message: OutboundMessage): Promise<{ externalId: string | null }> {
    log.warn("provider.channel_not_configured", {
      channel: this.channel,
      conversationId: message.conversationId,
    });
    throw new NotConfiguredError(this.name);
  }
}

class NoopEmailProvider implements EmailProvider {
  readonly name = "noop-email";
  readonly configured = false;
  async send(): Promise<void> {
    throw new NotConfiguredError(this.name);
  }
}

class NoopStorageProvider implements StorageProvider {
  readonly name = "noop-storage";
  readonly configured = false;
  async createUploadUrl(): Promise<{ uploadUrl: string; publicUrl: string }> {
    throw new NotConfiguredError(this.name);
  }
}

class NoopPaymentProvider implements PaymentProvider {
  readonly name = "noop-payment";
  readonly configured = false;
  async createCheckoutSession(): Promise<CheckoutSession> {
    throw new NotConfiguredError(this.name);
  }
}

export function getChannelProvider(
  channel: "WHATSAPP" | "INSTAGRAM"
): ChannelProvider {
  return new NoopChannelProvider(`noop-${channel.toLowerCase()}`, channel);
}

export function getEmailProvider(): EmailProvider {
  return new NoopEmailProvider();
}

export function getStorageProvider(): StorageProvider {
  return new NoopStorageProvider();
}

export function getPaymentProvider(): PaymentProvider {
  return new NoopPaymentProvider();
}

/** Diagnóstico usado por telas administrativas e health checks. */
export function providerStatus() {
  return {
    whatsapp: getChannelProvider("WHATSAPP").configured,
    instagram: getChannelProvider("INSTAGRAM").configured,
    email: getEmailProvider().configured,
    storage: getStorageProvider().configured,
    payment: getPaymentProvider().configured,
  };
}
