import "server-only";
import { ProviderError } from "@/lib/errors";
import { createLogger } from "@/lib/observability/logger";
import { executeTool } from "../tools";
import type { AIProvider, AIReply, AITool, ProviderRequest } from "../types";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ROUNDS = 4;

const log = createLogger({ provider: "anthropic" });

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

type ApiMessage = { role: "user" | "assistant"; content: string | ContentBlock[] };

/**
 * Adapter para a API da Anthropic, com loop de tool use.
 *
 * A chave sai apenas de `AI_API_KEY` (env do servidor). O arquivo é
 * `server-only`: importá-lo de um Client Component quebra o build em vez de
 * vazar o segredo.
 */
export class AnthropicAIProvider implements AIProvider {
  readonly name = "anthropic";
  readonly supportsTools = true;

  constructor(private readonly apiKey: string) {}

  async generateReply(request: ProviderRequest): Promise<AIReply> {
    const toolsUsed: string[] = [];
    const toolsByName = new Map(request.tools.map((tool) => [tool.name, tool]));

    const messages: ApiMessage[] = request.messages.map((message) => ({
      role: message.sender === "CLIENTE" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    }));

    // A API exige que a conversa comece com "user".
    while (messages.length > 0 && messages[0].role !== "user") messages.shift();
    if (messages.length === 0) {
      messages.push({ role: "user", content: "Olá" });
    }

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await this.call(request, messages);
      const blocks = response.content ?? [];

      const toolUses = blocks.filter(
        (block): block is Extract<ContentBlock, { type: "tool_use" }> =>
          block.type === "tool_use"
      );

      if (toolUses.length === 0) {
        const content = blocks
          .filter((block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim();

        if (!content) throw new ProviderError(this.name);
        return { content, provider: this.name, isReal: true, toolsUsed };
      }

      messages.push({ role: "assistant", content: blocks });

      const results: ContentBlock[] = [];
      for (const toolUse of toolUses) {
        const tool = toolsByName.get(toolUse.name);

        // Tool fora do allowlist do agente: recusa sem executar.
        if (!tool) {
          results.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({ ok: false, error: "Ferramenta indisponível." }),
          });
          continue;
        }

        const result = await executeTool(tool as AITool, toolUse.input, request.toolContext);
        toolsUsed.push(tool.name);
        results.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "user", content: results });
    }

    log.warn("ai.tool_rounds_exhausted");
    throw new ProviderError(this.name);
  }

  private async call(request: ProviderRequest, messages: ApiMessage[]) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? DEFAULT_MODEL,
        max_tokens: 1024,
        system: request.systemPrompt,
        messages,
        ...(request.tools.length > 0
          ? {
              tools: request.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: toJsonSchema(tool),
              })),
            }
          : {}),
      }),
    });

    if (!response.ok) {
      // Status e corpo ficam no log do servidor; o usuário recebe só a
      // mensagem genérica de ProviderError.
      log.error("ai.http_error", undefined, { status: response.status });
      throw new ProviderError(this.name);
    }

    return (await response.json()) as { content?: ContentBlock[] };
  }
}

/**
 * Converte o schema Zod da tool em JSON Schema mínimo.
 *
 * Mantido simples de propósito: as tools usam objetos rasos com strings e
 * enums. Uma dependência como zod-to-json-schema não se justifica aqui.
 */
function toJsonSchema(tool: AITool): Record<string, unknown> {
  const shape = (tool.inputSchema as unknown as { shape?: Record<string, unknown> }).shape;

  if (!shape) {
    return { type: "object", properties: {}, additionalProperties: false };
  }

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(shape)) {
    const def = (field as { def?: { type?: string; values?: string[] } }).def;
    const isOptional = def?.type === "optional";
    const inner = isOptional
      ? ((field as { def: { innerType?: { def?: { type?: string; values?: string[] } } } }).def
          .innerType?.def ?? def)
      : def;

    properties[key] =
      inner?.type === "enum"
        ? { type: "string", enum: inner.values ?? [] }
        : { type: "string" };

    if (!isOptional) required.push(key);
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false,
  };
}
