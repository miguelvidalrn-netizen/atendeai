import "server-only";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NotFoundError, ProviderError } from "@/lib/errors";
import { createLogger, newRequestId } from "@/lib/observability/logger";
import { emit } from "@/lib/events";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getCompanyPlan } from "@/lib/billing/limits";
import { deriveKey, withIdempotency } from "@/lib/idempotency";
import { MockAIProvider } from "./providers/mock";
import { AnthropicAIProvider } from "./providers/anthropic";
import { buildContext } from "./memory";
import { resolveTools } from "./tools";
import { DEFAULT_AGENT_ID, getAgent } from "./agents";
import type { AIProvider, AIReply, AgentId, ToolContext } from "./types";

/**
 * Orquestrador do pipeline de IA.
 *
 *   Input → ContextBuilder → Agent → Tools → Provider → Response → Event
 *
 * O contrato público continua o mesmo de antes (`generateReplyForConversation`),
 * então nenhum chamador existente precisou mudar.
 */

export function getAIProvider(): AIProvider {
  const apiKey = process.env.AI_API_KEY;
  return apiKey ? new AnthropicAIProvider(apiKey) : new MockAIProvider();
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

export type RunAgentParams = {
  /** Resolvido pela sessão do servidor. Nunca vem do cliente. */
  companyId: string;
  conversationId: string;
  actorUserId: string | null;
  agentId?: AgentId;
};

/**
 * Executa um agente sobre uma conversa e persiste a resposta.
 *
 * Idempotência: a chave é derivada da última mensagem do cliente, então
 * dois cliques em "gerar resposta" sem nova mensagem não criam duas
 * respostas da IA.
 */
export async function runAgentOnConversation(
  params: RunAgentParams
): Promise<AIReply> {
  const requestId = newRequestId();
  const log = createLogger({
    requestId,
    companyId: params.companyId,
    conversationId: params.conversationId,
    action: "ai.run_agent",
  });

  await enforceRateLimit("ai.generate", params.companyId);

  const context = await buildContext({
    companyId: params.companyId,
    conversationId: params.conversationId,
  });

  if (!context) throw new NotFoundError("Conversa");

  const plan = await getCompanyPlan(params.companyId);

  // multi_agent é feature de plano: sem ela, todo mundo usa o agente padrão.
  const requestedAgent = params.agentId ?? DEFAULT_AGENT_ID;
  const agentId = isFeatureEnabled("multi_agent", { plan })
    ? requestedAgent
    : DEFAULT_AGENT_ID;

  const agent = getAgent(agentId);
  const provider = getAIProvider();

  const toolsEnabled = isFeatureEnabled("ai_tools", { plan }) && provider.supportsTools;
  const tools = toolsEnabled ? resolveTools(agent.allowedTools) : [];

  const toolContext: ToolContext = {
    companyId: params.companyId,
    conversationId: params.conversationId,
    actorUserId: params.actorUserId,
  };

  const lastCustomer = [...context.history]
    .reverse()
    .find((message) => message.sender === "CLIENTE");

  const idempotencyKey = deriveKey([
    params.conversationId,
    agent.id,
    lastCustomer?.content?.slice(0, 120),
  ]);

  let reply: AIReply | null = null;

  await withIdempotency(
    { companyId: params.companyId, scope: "ai.reply", key: idempotencyKey },
    async () => {
      const generated = await provider.generateReply({
        systemPrompt: agent.buildSystemPrompt(context),
        messages: context.history,
        tools,
        toolContext,
      });

      const [row] = await db
        .insert(messages)
        .values({
          conversationId: params.conversationId,
          content: generated.content,
          sender: "IA",
        })
        .returning({ id: messages.id });

      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(
          and(
            eq(conversations.id, params.conversationId),
            eq(conversations.companyId, params.companyId)
          )
        );

      reply = generated;
      return row.id;
    }
  );

  if (!reply) {
    // Replay de idempotência: a resposta já existe no histórico.
    const previous = await db
      .select({ content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, params.conversationId))
      .limit(1);

    throw new ProviderError(
      provider.name,
      new Error(`Resposta já gerada (${previous.length} mensagens).`)
    );
  }

  const finalReply = reply as AIReply;

  await emit(
    "ai.response_generated",
    params.companyId,
    {
      conversationId: params.conversationId,
      agent: agent.id,
      provider: finalReply.provider,
      isReal: finalReply.isReal,
      toolsUsed: finalReply.toolsUsed,
    },
    params.actorUserId
  );

  log.info("ai.reply_generated", {
    agent: agent.id,
    provider: finalReply.provider,
    isReal: finalReply.isReal,
    toolCount: finalReply.toolsUsed.length,
  });

  return finalReply;
}
