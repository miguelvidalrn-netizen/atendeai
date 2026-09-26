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

  // Rate limit primeiro e sozinho: é a checagem mais barata e mais provável
  // de rejeitar a request, então nenhuma query de contexto roda à toa
  // quando o limite já estourou.
  await enforceRateLimit("ai.generate", params.companyId);

  // buildContext (5 queries internas) e getCompanyPlan (1 query) não dependem
  // um do outro — só de companyId, já disponível. Rodar em paralelo poupa
  // uma volta inteira de round-trip ao banco a cada resposta gerada.
  const [built, plan] = await Promise.all([
    buildContext({
      companyId: params.companyId,
      conversationId: params.conversationId,
    }),
    getCompanyPlan(params.companyId),
  ]);

  if (!built) throw new NotFoundError("Conversa");

  const { context, customerKey } = built;

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
    customerKey,
  };

  const lastCustomer = [...context.history]
    .reverse()
    .find((message) => message.sender === "CLIENTE");

  const idempotencyKey = deriveKey([
    params.conversationId,
    agent.id,
    lastCustomer?.content?.slice(0, 120),
  ]);

  let generatedReply: AIReply | null = null;

  const { entityId: messageId, replayed } = await withIdempotency(
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

      generatedReply = generated;
      return row.id;
    }
  );

  if (replayed) {
    // Retry sem mensagem nova do cliente: devolve a resposta que já existe,
    // em vez de gerar (e cobrar) uma nova. Nenhum evento é reemitido — os
    // efeitos colaterais da primeira execução já aconteceram.
    const [existing] = await db
      .select({ content: messages.content })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!existing) {
      throw new ProviderError(
        provider.name,
        new Error(`Idempotency key aponta para mensagem inexistente (${messageId}).`)
      );
    }

    log.info("ai.reply_replayed", { agent: agent.id });

    return {
      content: existing.content,
      provider: provider.name,
      isReal: isAIConfigured(),
      toolsUsed: [],
    };
  }

  if (!generatedReply) {
    throw new ProviderError(provider.name, new Error("Pipeline de IA não retornou conteúdo."));
  }

  // TypeScript não rastreia a atribuição de `generatedReply` dentro do
  // closure passado a `withIdempotency`, então trata a variável como
  // permanentemente `null` neste ponto. O `unknown` intermediário contorna
  // essa limitação; a checagem de runtime acima já garante o valor real.
  const finalReply = generatedReply as unknown as AIReply;

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
