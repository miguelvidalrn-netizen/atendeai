import "server-only";
import { renderSystemPrompt } from "./prompts";
import type { Agent, AgentId, AIContext } from "./types";

/**
 * Agentes especializados.
 *
 * Cada um é uma configuração declarativa: prompt versionado + conjunto de
 * tools permitidas + permissão exigida. Não há comportamento complexo
 * implementado — o núcleo é que fica pronto para múltiplos agentes.
 *
 * O conjunto de tools é um ALLOWLIST por agente: o agente de qualificação
 * não consegue chamar tools fora da sua lista mesmo que o modelo tente.
 */

function defineAgent(config: {
  id: AgentId;
  label: string;
  promptRef: string;
  allowedTools: string[];
}): Agent {
  return {
    ...config,
    requiredPermission: "conversation:write",
    buildSystemPrompt(context: AIContext) {
      return renderSystemPrompt(config.promptRef, context);
    },
  };
}

export const SupportAgent = defineAgent({
  id: "support",
  label: "Atendimento",
  promptRef: "support-agent@v1",
  allowedTools: [
    "getProducts",
    "getServices",
    "getKnowledge",
    "getBusinessHours",
    "handoffToHuman",
  ],
});

export const SalesAgent = defineAgent({
  id: "sales",
  label: "Vendas",
  promptRef: "sales-agent@v1",
  allowedTools: [
    "getProducts",
    "getServices",
    "getKnowledge",
    "getLead",
    "createLead",
    "updateLead",
    "handoffToHuman",
  ],
});

export const QualificationAgent = defineAgent({
  id: "qualification",
  label: "Qualificação",
  promptRef: "qualification-agent@v1",
  allowedTools: ["getProducts", "getServices", "getLead", "updateLead"],
});

export const AGENTS: Record<AgentId, Agent> = {
  support: SupportAgent,
  sales: SalesAgent,
  qualification: QualificationAgent,
};

export function getAgent(id: AgentId): Agent {
  return AGENTS[id] ?? SupportAgent;
}

export const DEFAULT_AGENT_ID: AgentId = "support";
