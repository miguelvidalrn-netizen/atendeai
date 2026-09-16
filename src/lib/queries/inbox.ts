import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";

export type InboxItem = {
  id: string;
  customerName: string;
  customerContact: string | null;
  channel: "WEBCHAT" | "WHATSAPP" | "INSTAGRAM" | "OUTRO";
  status: "ABERTA" | "ATENDIDA" | "FECHADA";
  updatedAt: Date;
  lastMessage: string | null;
  lastMessageSender: "CLIENTE" | "EMPRESA" | "IA" | null;
  /** true quando a IA ou uma automação pediu atendimento humano. */
  handoffRequested: boolean;
};

/**
 * Lista as conversas da empresa com a última mensagem de cada uma.
 * O filtro por companyId garante o isolamento entre empresas.
 */
export async function listInbox(companyId: string): Promise<InboxItem[]> {
  const lastMessage = db
    .select({
      conversationId: messages.conversationId,
      content: messages.content,
      sender: messages.sender,
      createdAt: messages.createdAt,
      rowNumber:
        sql<number>`row_number() over (partition by ${messages.conversationId} order by ${messages.createdAt} desc)`.as(
          "row_number"
        ),
    })
    .from(messages)
    .as("last_message");

  const rows = await db
    .select({
      id: conversations.id,
      customerName: conversations.customerName,
      customerContact: conversations.customerContact,
      channel: conversations.channel,
      status: conversations.status,
      updatedAt: conversations.updatedAt,
      lastMessage: lastMessage.content,
      lastMessageSender: lastMessage.sender,
      handoffRequested: conversations.handoffRequested,
    })
    .from(conversations)
    .leftJoin(
      lastMessage,
      sql`${lastMessage.conversationId} = ${conversations.id} and ${lastMessage.rowNumber} = 1`
    )
    .where(eq(conversations.companyId, companyId))
    .orderBy(desc(conversations.updatedAt));

  return rows;
}
