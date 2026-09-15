import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";

export async function listConversationsByCompany(companyId: string) {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.companyId, companyId))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversationById(
  conversationId: string,
  companyId: string
) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation || conversation.companyId !== companyId) return null;
  return conversation;
}

export async function listMessagesByConversation(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}
