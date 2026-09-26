import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  aiSettings,
  companies,
  conversations,
  customerMemories,
  knowledgeItems,
  leads,
  messages,
  products,
} from "@/db/schema";
import { NotFoundError } from "@/lib/errors";
import type {
  AICatalogItem,
  AIContext,
  AIKnowledgeItem,
  AILeadSnapshot,
  AIMessage,
} from "./types";

/**
 * Memória do agente, separada em quatro fontes independentes.
 *
 * A separação é o que permite evoluir cada uma isoladamente: trocar
 * `getKnowledgeContext` por uma busca vetorial (RAG) não exige tocar em
 * `getRecentMessages` nem no agente. Nenhum vector database é usado agora.
 */
export interface MemoryProvider {
  readonly name: string;
  /** Histórico recente da conversa. */
  getRecentMessages(conversationId: string, limit?: number): Promise<AIMessage[]>;
  /** Dados estáveis da empresa: identidade, catálogo, tom, regras. */
  getBusinessContext(companyId: string): Promise<{
    company: AIContext["company"];
    catalog: AICatalogItem[];
    settings: AIContext["settings"];
  }>;
  /** Conhecimento consultável. Ponto de extensão natural para RAG. */
  getKnowledgeContext(
    companyId: string,
    query?: string
  ): Promise<AIKnowledgeItem[]>;
  /** Fatos duráveis sobre o cliente, acumulados entre conversas. */
  getCustomerMemory(
    companyId: string,
    customerKey: string
  ): Promise<{ summary: string | null; attributes: Record<string, unknown> | null } | null>;
  saveCustomerMemory(
    companyId: string,
    customerKey: string,
    data: { summary?: string; attributes?: Record<string, unknown> }
  ): Promise<void>;
}

/** Implementação sobre as tabelas relacionais existentes. */
export class SqlMemoryProvider implements MemoryProvider {
  readonly name = "sql";

  async getRecentMessages(conversationId: string, limit = 30): Promise<AIMessage[]> {
    // Pega as N mais recentes e reordena cronologicamente, evitando carregar
    // conversas longas inteiras a cada chamada.
    const rows = await db
      .select({ sender: messages.sender, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return rows.reverse();
  }

  async getBusinessContext(companyId: string) {
    const [[company], catalog, [settings]] = await Promise.all([
      db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
      db
        .select()
        .from(products)
        .where(and(eq(products.companyId, companyId), eq(products.active, true))),
      db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.companyId, companyId))
        .limit(1),
    ]);

    if (!company) throw new NotFoundError("Empresa");

    return {
      company: {
        id: company.id,
        name: company.name,
        segment: company.segment,
        description: company.description,
        phone: company.phone,
        whatsapp: company.whatsapp,
      },
      catalog: catalog.map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        type: item.type,
      })),
      settings: {
        tone: settings?.tone ?? ("AMIGAVEL" as const),
        rules: settings?.rules ?? null,
        businessHours: settings?.businessHours ?? null,
      },
    };
  }

  async getKnowledgeContext(companyId: string, query?: string) {
    const rows = await db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.companyId, companyId),
          eq(knowledgeItems.active, true)
        )
      )
      .orderBy(asc(knowledgeItems.createdAt));

    const mapped = rows.map((row) => ({
      question: row.question,
      answer: row.answer,
      category: row.category as string,
    }));

    if (!query) return mapped;

    // Filtro léxico simples. Substituível por busca semântica sem que o
    // agente perceba a diferença.
    const term = query.toLowerCase();
    const matches = mapped.filter(
      (item) =>
        item.question.toLowerCase().includes(term) ||
        item.answer.toLowerCase().includes(term)
    );
    return matches.length > 0 ? matches : mapped;
  }

  async getCustomerMemory(companyId: string, customerKey: string) {
    const [row] = await db
      .select()
      .from(customerMemories)
      .where(
        and(
          eq(customerMemories.companyId, companyId),
          eq(customerMemories.customerKey, customerKey)
        )
      )
      .limit(1);

    if (!row) return null;
    return { summary: row.summary, attributes: row.attributes ?? null };
  }

  async saveCustomerMemory(
    companyId: string,
    customerKey: string,
    data: { summary?: string; attributes?: Record<string, unknown> }
  ) {
    await db
      .insert(customerMemories)
      .values({
        companyId,
        customerKey,
        summary: data.summary ?? null,
        attributes: data.attributes ?? null,
      })
      .onConflictDoUpdate({
        target: [customerMemories.companyId, customerMemories.customerKey],
        set: {
          summary: data.summary ?? null,
          attributes: data.attributes ?? null,
          updatedAt: new Date(),
        },
      });
  }
}

declare global {
  var __atendeaiMemoryProvider: MemoryProvider | undefined;
}

export function getMemoryProvider(): MemoryProvider {
  if (!globalThis.__atendeaiMemoryProvider) {
    globalThis.__atendeaiMemoryProvider = new SqlMemoryProvider();
  }
  return globalThis.__atendeaiMemoryProvider;
}

/**
 * Context Builder: junta as quatro memórias em um AIContext.
 *
 * MULTI-TENANT: recebe companyId já resolvido pelo servidor e valida que a
 * conversa pertence a ele antes de carregar qualquer coisa.
 */
export type BuiltContext = { context: AIContext; customerKey: string };

export async function buildContext(params: {
  companyId: string;
  conversationId: string;
  query?: string;
}): Promise<BuiltContext | null> {
  const memory = getMemoryProvider();

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, params.conversationId),
        eq(conversations.companyId, params.companyId)
      )
    )
    .limit(1);

  if (!conversation) return null;

  const customerKey = conversation.customerContact ?? conversation.id;

  const [business, knowledge, history, customerMemory, leadRow] = await Promise.all([
    memory.getBusinessContext(params.companyId),
    memory.getKnowledgeContext(params.companyId, params.query),
    memory.getRecentMessages(params.conversationId),
    memory.getCustomerMemory(params.companyId, customerKey),
    db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.companyId, params.companyId),
          eq(leads.conversationId, params.conversationId)
        )
      )
      .limit(1),
  ]);

  const lead: AILeadSnapshot | null = leadRow[0]
    ? {
        id: leadRow[0].id,
        name: leadRow[0].name,
        status: leadRow[0].status,
        estimatedValue: leadRow[0].estimatedValue,
        notes: leadRow[0].notes,
      }
    : null;

  return {
    context: {
      company: business.company,
      catalog: business.catalog,
      settings: business.settings,
      knowledge,
      history,
      customerMemory,
      lead,
    },
    customerKey,
  };
}
