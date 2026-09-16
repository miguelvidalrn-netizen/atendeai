import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, leads } from "@/db/schema";

/**
 * Lista os leads da empresa com a origem (canal da conversa que os gerou,
 * quando existir). O join é opcional: leads criados manualmente não têm
 * `conversationId` e continuam aparecendo normalmente.
 */
export async function listLeadsByCompany(companyId: string) {
  return db
    .select({
      id: leads.id,
      companyId: leads.companyId,
      conversationId: leads.conversationId,
      name: leads.name,
      contact: leads.contact,
      status: leads.status,
      estimatedValue: leads.estimatedValue,
      notes: leads.notes,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      channel: conversations.channel,
    })
    .from(leads)
    .leftJoin(conversations, eq(conversations.id, leads.conversationId))
    .where(eq(leads.companyId, companyId))
    .orderBy(desc(leads.updatedAt));
}

/**
 * Lead vinculado a uma conversa específica, se existir.
 * Filtrado por companyId — não é possível obter lead de outra empresa
 * mesmo sabendo o id da conversa.
 */
export async function getLeadByConversation(
  conversationId: string,
  companyId: string
) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(
      and(eq(leads.conversationId, conversationId), eq(leads.companyId, companyId))
    )
    .orderBy(desc(leads.createdAt))
    .limit(1);

  return lead ?? null;
}
