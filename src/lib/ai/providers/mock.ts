import "server-only";
import { executeTool } from "../tools";
import type { AIProvider, AIReply, ProviderRequest } from "../types";

/**
 * Provedor de desenvolvimento.
 *
 * Não chama modelo nenhum. Simula o ciclo completo do agente — inclusive a
 * execução de uma tool de leitura — para que o pipeline
 * (contexto → tools → resposta → evento) possa ser exercitado sem chave
 * de API. Toda resposta sai marcada com `isReal: false`.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  readonly supportsTools = true;

  async generateReply(request: ProviderRequest): Promise<AIReply> {
    const lastCustomerMessage = [...request.messages]
      .reverse()
      .find((message) => message.sender === "CLIENTE");

    const question = (lastCustomerMessage?.content ?? "").toLowerCase();
    const toolsUsed: string[] = [];

    // 1. Base de conhecimento, via tool real (exercita o caminho completo).
    const knowledgeTool = request.tools.find((tool) => tool.name === "getKnowledge");
    if (knowledgeTool) {
      const result = await executeTool(knowledgeTool, { topic: question }, request.toolContext);
      toolsUsed.push(knowledgeTool.name);

      if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
        const hit = (result.data as { question: string; answer: string }[]).find((item) =>
          question.length > 3 && item.question.toLowerCase().includes(question.slice(0, 10))
        );
        if (hit) {
          return this.reply(hit.answer, toolsUsed);
        }
      }
    }

    // 2. Catálogo, via tool real.
    const productsTool = request.tools.find((tool) => tool.name === "getProducts");
    if (productsTool) {
      const result = await executeTool(productsTool, {}, request.toolContext);
      toolsUsed.push(productsTool.name);

      if (result.ok && Array.isArray(result.data)) {
        const items = result.data as { name: string; price: string | null }[];
        const hit = items.find((item) => question.includes(item.name.toLowerCase()));

        if (hit) {
          const price = hit.price
            ? Number(hit.price).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
            : "sob consulta";
          return this.reply(
            `Temos sim! ${hit.name} está ${price}. Quer que eu separe para você?`,
            toolsUsed
          );
        }
      }
    }

    // 3. Acolhimento genérico.
    const companyName = extractCompanyName(request.systemPrompt);
    return this.reply(
      `Olá! Aqui é o atendimento${companyName ? ` da ${companyName}` : ""}. Me conta um pouco mais sobre o que você procura que eu te ajudo.`,
      toolsUsed
    );
  }

  private reply(content: string, toolsUsed: string[]): AIReply {
    return { content, provider: this.name, isReal: false, toolsUsed };
  }
}

function extractCompanyName(systemPrompt: string): string | null {
  const match = systemPrompt.match(/Nome: (.+)/);
  return match?.[1]?.trim() ?? null;
}
