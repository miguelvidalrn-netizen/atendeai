import "server-only";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { conversations, knowledgeItems, leads, products } from "@/db/schema";

export type DashboardStats = {
  totalProducts: number;
  activeProducts: number;
  totalConversations: number;
  openConversations: number;
  totalLeads: number;
  wonLeads: number;
  knowledgeCount: number;
};

/**
 * Métricas do painel. Todas as contagens são filtradas por companyId —
 * nenhum número vem de outra empresa e nada aqui é inventado.
 */
export async function getDashboardStats(
  companyId: string
): Promise<DashboardStats> {
  const [
    [productCount],
    [activeProductCount],
    [conversationCount],
    [openConversationCount],
    [leadCount],
    [wonLeadCount],
    [knowledgeCount],
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(products)
      .where(eq(products.companyId, companyId)),
    db
      .select({ value: count() })
      .from(products)
      .where(and(eq(products.companyId, companyId), eq(products.active, true))),
    db
      .select({ value: count() })
      .from(conversations)
      .where(eq(conversations.companyId, companyId)),
    db
      .select({ value: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.companyId, companyId),
          ne(conversations.status, "FECHADA")
        )
      ),
    db
      .select({ value: count() })
      .from(leads)
      .where(eq(leads.companyId, companyId)),
    db
      .select({ value: count() })
      .from(leads)
      .where(and(eq(leads.companyId, companyId), eq(leads.status, "GANHO"))),
    db
      .select({ value: count() })
      .from(knowledgeItems)
      .where(eq(knowledgeItems.companyId, companyId)),
  ]);

  return {
    totalProducts: productCount?.value ?? 0,
    activeProducts: activeProductCount?.value ?? 0,
    totalConversations: conversationCount?.value ?? 0,
    openConversations: openConversationCount?.value ?? 0,
    totalLeads: leadCount?.value ?? 0,
    wonLeads: wonLeadCount?.value ?? 0,
    knowledgeCount: knowledgeCount?.value ?? 0,
  };
}
