"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { requirePermission } from "@/lib/guards";
import { newConversationSchema, sendMessageSchema } from "@/lib/validations";
import { runAction, validationErrorFrom, type ActionResult } from "@/lib/action-result";
import { NotFoundError } from "@/lib/errors";
import { emit } from "@/lib/events";
import { deriveKey, withIdempotency } from "@/lib/idempotency";
import { enforceLimit } from "@/lib/billing/limits";
import { runAgentOnConversation } from "@/lib/ai/service";
import type { AgentId } from "@/lib/ai/types";

/**
 * NOTA DE SEGURANÇA
 * Este arquivo é `"use server"`: TODA função exportada vira um endpoint RPC
 * invocável pelo cliente. Por isso nenhuma função de leitura mora aqui —
 * elas ficam em `lib/queries`, que é `server-only` e não gera endpoint.
 * Toda função abaixo começa resolvendo o escopo pelo servidor.
 */

export type ConversationFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  conversationId?: string;
};

export async function createConversationAction(
  _prevState: ConversationFormState,
  formData: FormData
): Promise<ConversationFormState> {
  const result = await runAction("conversation.create", {}, async () => {
    const { company, user } = await requirePermission("conversation:write");

    const parsed = newConversationSchema.safeParse({
      customerName: formData.get("customerName"),
      customerContact: formData.get("customerContact") ?? "",
      channel: formData.get("channel"),
      firstMessage: formData.get("firstMessage"),
    });

    if (!parsed.success) throw validationErrorFrom(parsed.error);

    await enforceLimit(company.id, "conversationsPerMonth");

    const { customerName, customerContact, channel, firstMessage } = parsed.data;

    // Duplo clique no botão não cria duas conversas idênticas.
    const { entityId } = await withIdempotency(
      {
        companyId: company.id,
        scope: "conversation.create",
        key: deriveKey([customerName, customerContact, firstMessage.slice(0, 80)]),
      },
      async () => {
        const [conversation] = await db
          .insert(conversations)
          .values({
            companyId: company.id,
            customerName,
            customerContact: customerContact || null,
            channel,
            status: "ABERTA",
          })
          .returning({ id: conversations.id });

        await db.insert(messages).values({
          conversationId: conversation.id,
          content: firstMessage,
          sender: "CLIENTE",
        });

        return conversation.id;
      }
    );

    await emit(
      "conversation.created",
      company.id,
      { conversationId: entityId, customerName, channel },
      user.id
    );

    revalidatePath("/dashboard/conversas");
    revalidatePath("/dashboard");
    return entityId;
  });

  return result.ok
    ? { success: true, conversationId: result.data }
    : { error: result.error, fieldErrors: result.fieldErrors };
}

export type SendMessageState = {
  error?: string;
  success?: boolean;
};

export async function sendMessageAction(
  _prevState: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const result = await runAction("conversation.send_message", {}, async () => {
    const { company, user } = await requirePermission("conversation:write");

    const parsed = sendMessageSchema.safeParse({
      conversationId: formData.get("conversationId"),
      content: formData.get("content"),
    });

    if (!parsed.success) throw validationErrorFrom(parsed.error);

    const { conversationId, content } = parsed.data;

    // Filtro por companyId: impede escrever em conversa de outra empresa.
    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.companyId, company.id)
        )
      )
      .limit(1);

    if (!conversation) throw new NotFoundError("Conversa");

    const [message] = await db
      .insert(messages)
      .values({ conversationId, content, sender: "EMPRESA" })
      .returning({ id: messages.id });

    await db
      .update(conversations)
      .set({ status: "ATENDIDA", updatedAt: new Date() })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.companyId, company.id)
        )
      );

    await emit(
      "message.created",
      company.id,
      { conversationId, messageId: message.id, sender: "EMPRESA" },
      user.id
    );

    revalidatePath(`/dashboard/conversas/${conversationId}`);
    revalidatePath("/dashboard/conversas");
  });

  return result.ok ? { success: true } : { error: result.error };
}

export async function closeConversationAction(
  conversationId: string
): Promise<ActionResult> {
  return runAction("conversation.close", { conversationId }, async () => {
    const { company, user } = await requirePermission("conversation:write");

    const updated = await db
      .update(conversations)
      .set({ status: "FECHADA", updatedAt: new Date() })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.companyId, company.id)
        )
      )
      .returning({ id: conversations.id });

    if (updated.length === 0) throw new NotFoundError("Conversa");

    await emit("conversation.closed", company.id, { conversationId }, user.id);

    revalidatePath(`/dashboard/conversas/${conversationId}`);
    revalidatePath("/dashboard/conversas");
  });
}

export async function generateAIReplyAction(
  conversationId: string,
  agentId?: AgentId
): Promise<ActionResult<{ isReal: boolean; toolsUsed: string[] }>> {
  return runAction("ai.generate_reply", { conversationId }, async () => {
    const { company, user } = await requirePermission("conversation:write");

    const reply = await runAgentOnConversation({
      companyId: company.id,
      conversationId,
      actorUserId: user.id,
      agentId,
    });

    revalidatePath(`/dashboard/conversas/${conversationId}`);
    revalidatePath("/dashboard/conversas");

    return { isReal: reply.isReal, toolsUsed: reply.toolsUsed };
  });
}
