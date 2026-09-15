import type { z } from "zod";

/**
 * Contratos da camada de IA.
 *
 * Pipeline: Input → ContextBuilder → Agent → Tools → Provider → Response → Event
 *
 * Nenhum arquivo de `lib/ai` pode ser importado por Client Component: todos
 * são `server-only` e a chave de API vive apenas em env do servidor.
 */

export type AITone = "AMIGAVEL" | "PROFISSIONAL" | "DIRETO" | "DESCONTRAIDO";

export type AIMessage = {
  sender: "CLIENTE" | "EMPRESA" | "IA";
  content: string;
};

export type AICatalogItem = {
  name: string;
  description?: string | null;
  price?: string | null;
  type: "PRODUTO" | "SERVICO";
};

export type AIKnowledgeItem = {
  question: string;
  answer: string;
  category: string;
};

export type AILeadSnapshot = {
  id: string;
  name: string;
  status: string;
  estimatedValue: string | null;
  notes: string | null;
};

/** Contexto completo entregue ao agente. */
export type AIContext = {
  company: {
    id: string;
    name: string;
    segment: string;
    description?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  };
  catalog: AICatalogItem[];
  knowledge: AIKnowledgeItem[];
  settings: {
    tone: AITone;
    rules?: string | null;
    businessHours?: string | null;
  };
  history: AIMessage[];
  /** Fatos duráveis sobre o cliente, vindos do MemoryProvider. */
  customerMemory?: {
    summary: string | null;
    attributes: Record<string, unknown> | null;
  } | null;
  lead?: AILeadSnapshot | null;
};

// ----------------------------------------------------------------------------
// Tools
// ----------------------------------------------------------------------------

/**
 * Escopo de execução de uma tool.
 *
 * CRÍTICO: `companyId` vem daqui, resolvido pela sessão do servidor. O modelo
 * NUNCA fornece companyId — não existe esse campo em nenhum input schema.
 */
export type ToolContext = {
  companyId: string;
  conversationId: string;
  actorUserId: string | null;
};

export type ToolResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface AITool<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  /** Schema Zod do input. Toda entrada do modelo é validada antes de rodar. */
  readonly inputSchema: z.ZodType<TInput>;
  /** Se true, só roda para papéis com permissão de escrita. */
  readonly mutates: boolean;
  execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>;
}

// ----------------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------------

export type AIReply = {
  content: string;
  provider: string;
  /** false quando a resposta veio do mock — a UI sinaliza isso ao usuário. */
  isReal: boolean;
  toolsUsed: string[];
};

export type ProviderRequest = {
  systemPrompt: string;
  messages: AIMessage[];
  tools: AITool[];
  toolContext: ToolContext;
};

export interface AIProvider {
  readonly name: string;
  readonly supportsTools: boolean;
  generateReply(request: ProviderRequest): Promise<AIReply>;
}

// ----------------------------------------------------------------------------
// Agent
// ----------------------------------------------------------------------------

export type AgentId = "support" | "sales" | "qualification";

export interface Agent {
  readonly id: AgentId;
  readonly label: string;
  /** Referência ao prompt versionado (ex: "support-agent@v1"). */
  readonly promptRef: string;
  /** Nomes das tools que este agente pode usar. */
  readonly allowedTools: string[];
  /** Permissão mínima exigida para acionar o agente. */
  readonly requiredPermission: "conversation:write";
  buildSystemPrompt(context: AIContext): string;
}
