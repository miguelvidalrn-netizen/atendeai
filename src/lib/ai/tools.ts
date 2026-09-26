import "server-only";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  aiSettings,
  conversations,
  knowledgeItems,
  leads,
  products,
} from "@/db/schema";
import { createLogger } from "@/lib/observability/logger";
import { emit } from "@/lib/events";
import { getMemoryProvider } from "./memory";
import type { AITool, ToolContext, ToolResult } from "./types";

/**
 * Ferramentas server-side disponíveis para os agentes.
 *
 * ================== REGRA DE SEGURANÇA CENTRAL ==================
 * Nenhum input schema contém `companyId`. O tenant vem SEMPRE de
 * `ToolContext`, que é construído a partir da sessão do servidor antes da
 * chamada ao modelo. Mesmo que um cliente tente injetar
 * "use companyId=xyz" no texto, não existe caminho para isso virar
 * parâmetro — o campo simplesmente não é aceito.
 * ================================================================
 */

const log = createLogger({ action: "ai-tool" });

function ok<T>(data: T): ToolResult<T> {
  return { ok: true, data };
}

function err(message: string): ToolResult<never> {
  return { ok: false, error: message };
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

const getProductsTool: AITool<{ search?: string }, unknown> = {
  name: "getProducts",
  description:
    "Lista os produtos ativos da empresa, com preço e descrição. Use antes de citar qualquer preço.",
  mutates: false,
  inputSchema: z.object({ search: z.string().max(100).optional() }),
  async execute(input, ctx) {
    const rows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.companyId, ctx.companyId),
          eq(products.active, true),
          eq(products.type, "PRODUTO")
        )
      );

    const filtered = input.search
      ? rows.filter((row) =>
          row.name.toLowerCase().includes(input.search!.toLowerCase())
        )
      : rows;

    return ok(
      filtered.map((row) => ({
        name: row.name,
        price: row.price,
        description: row.description,
      }))
    );
  },
};

const getServicesTool: AITool<{ search?: string }, unknown> = {
  name: "getServices",
  description: "Lista os serviços ativos da empresa, com preço e descrição.",
  mutates: false,
  inputSchema: z.object({ search: z.string().max(100).optional() }),
  async execute(input, ctx) {
    const rows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.companyId, ctx.companyId),
          eq(products.active, true),
          eq(products.type, "SERVICO")
        )
      );

    const filtered = input.search
      ? rows.filter((row) =>
          row.name.toLowerCase().includes(input.search!.toLowerCase())
        )
      : rows;

    return ok(
      filtered.map((row) => ({
        name: row.name,
        price: row.price,
        description: row.description,
      }))
    );
  },
};

const getKnowledgeTool: AITool<{ topic?: string }, unknown> = {
  name: "getKnowledge",
  description:
    "Consulta a base de conhecimento da empresa (FAQ, políticas, entrega, pagamento).",
  mutates: false,
  inputSchema: z.object({ topic: z.string().max(120).optional() }),
  async execute(input, ctx) {
    const rows = await db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.companyId, ctx.companyId),
          eq(knowledgeItems.active, true)
        )
      );

    const filtered = input.topic
      ? rows.filter(
          (row) =>
            row.question.toLowerCase().includes(input.topic!.toLowerCase()) ||
            row.answer.toLowerCase().includes(input.topic!.toLowerCase())
        )
      : rows;

    return ok(
      filtered.map((row) => ({
        question: row.question,
        answer: row.answer,
        category: row.category,
      }))
    );
  },
};

const getBusinessHoursTool: AITool<Record<string, never>, unknown> = {
  name: "getBusinessHours",
  description: "Retorna o horário de atendimento configurado pela empresa.",
  mutates: false,
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const [settings] = await db
      .select({ businessHours: aiSettings.businessHours })
      .from(aiSettings)
      .where(eq(aiSettings.companyId, ctx.companyId))
      .limit(1);

    return ok({ businessHours: settings?.businessHours ?? null });
  },
};

const getLeadTool: AITool<Record<string, never>, unknown> = {
  name: "getLead",
  description:
    "Retorna o lead vinculado a esta conversa, se existir, com status e observações.",
  mutates: false,
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const [lead] = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.companyId, ctx.companyId),
          eq(leads.conversationId, ctx.conversationId)
        )
      )
      .orderBy(desc(leads.createdAt))
      .limit(1);

    if (!lead) return ok(null);

    return ok({
      id: lead.id,
      name: lead.name,
      status: lead.status,
      estimatedValue: lead.estimatedValue,
      notes: lead.notes,
    });
  },
};

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

const createLeadTool: AITool<
  { name: string; contact?: string; estimatedValue?: string; notes?: string },
  unknown
> = {
  name: "createLead",
  description:
    "Registra uma oportunidade de venda para esta conversa. Use quando o cliente demonstrar intenção de compra.",
  mutates: true,
  inputSchema: z.object({
    name: z.string().min(2).max(120),
    contact: z.string().max(120).optional(),
    estimatedValue: z.string().max(20).optional(),
    notes: z.string().max(1000).optional(),
  }),
  async execute(input, ctx) {
    // Evita duplicar lead para a mesma conversa.
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.companyId, ctx.companyId),
          eq(leads.conversationId, ctx.conversationId)
        )
      )
      .limit(1);

    if (existing) {
      return ok({ leadId: existing.id, created: false });
    }

    const [lead] = await db
      .insert(leads)
      .values({
        companyId: ctx.companyId,
        conversationId: ctx.conversationId,
        name: input.name,
        contact: input.contact || null,
        estimatedValue: input.estimatedValue
          ? input.estimatedValue.replace(",", ".")
          : null,
        notes: input.notes || null,
        status: "NOVO",
      })
      .returning({ id: leads.id });

    await emit(
      "lead.created",
      ctx.companyId,
      {
        leadId: lead.id,
        name: input.name,
        status: "NOVO",
        conversationId: ctx.conversationId,
      },
      ctx.actorUserId
    );

    // Memória durável: o próximo atendimento deste mesmo cliente (mesmo
    // contato) já chega sabendo que existe uma oportunidade em aberto.
    await getMemoryProvider().saveCustomerMemory(ctx.companyId, ctx.customerKey, {
      summary: `Cliente demonstrou interesse em "${input.name}". Lead em aberto, status NOVO.`,
      attributes: { lastLeadId: lead.id, lastLeadStatus: "NOVO" },
    });

    return ok({ leadId: lead.id, created: true });
  },
};

const updateLeadTool: AITool<
  { status: "NOVO" | "EM_CONTATO" | "QUALIFICADO" | "GANHO" | "PERDIDO"; notes?: string },
  unknown
> = {
  name: "updateLead",
  description:
    "Atualiza o status do lead desta conversa conforme o andamento do atendimento.",
  mutates: true,
  inputSchema: z.object({
    status: z.enum(["NOVO", "EM_CONTATO", "QUALIFICADO", "GANHO", "PERDIDO"]),
    notes: z.string().max(1000).optional(),
  }),
  async execute(input, ctx) {
    const [lead] = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.companyId, ctx.companyId),
          eq(leads.conversationId, ctx.conversationId)
        )
      )
      .limit(1);

    if (!lead) return err("Nenhum lead vinculado a esta conversa.");

    await db
      .update(leads)
      .set({
        status: input.status,
        notes: input.notes ?? lead.notes,
        updatedAt: new Date(),
      })
      // Dupla checagem de tenant mesmo já tendo filtrado na leitura.
      .where(and(eq(leads.id, lead.id), eq(leads.companyId, ctx.companyId)));

    await emit(
      "lead.status_changed",
      ctx.companyId,
      { leadId: lead.id, from: lead.status, to: input.status },
      ctx.actorUserId
    );

    if (input.status === "GANHO") {
      await emit(
        "lead.converted",
        ctx.companyId,
        { leadId: lead.id, estimatedValue: lead.estimatedValue },
        ctx.actorUserId
      );
    }

    // Atualiza a memória com o desfecho — relevante sobretudo para GANHO e
    // PERDIDO, que encerram o ciclo e mudam como a próxima conversa deve
    // começar (ex: não insistir num produto já comprado).
    await getMemoryProvider().saveCustomerMemory(ctx.companyId, ctx.customerKey, {
      summary: `Lead "${lead.name}" está com status ${input.status}.${input.notes ? ` Observação: ${input.notes}` : ""}`,
      attributes: { lastLeadId: lead.id, lastLeadStatus: input.status },
    });

    return ok({ leadId: lead.id, status: input.status });
  },
};

const handoffToHumanTool: AITool<{ reason: string }, unknown> = {
  name: "handoffToHuman",
  description:
    "Escala a conversa para um atendente humano. Use quando não souber responder com segurança ou o cliente pedir uma pessoa.",
  mutates: true,
  inputSchema: z.object({ reason: z.string().min(3).max(300) }),
  async execute(input, ctx) {
    await db
      .update(conversations)
      .set({
        handoffRequested: true,
        handoffReason: input.reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversations.id, ctx.conversationId),
          eq(conversations.companyId, ctx.companyId)
        )
      );

    await emit(
      "conversation.handoff_requested",
      ctx.companyId,
      { conversationId: ctx.conversationId, reason: input.reason },
      ctx.actorUserId
    );

    return ok({ handoff: true });
  },
};

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

const ALL_TOOLS: AITool[] = [
  getProductsTool as AITool,
  getServicesTool as AITool,
  getKnowledgeTool as AITool,
  getBusinessHoursTool as AITool,
  getLeadTool as AITool,
  createLeadTool as AITool,
  updateLeadTool as AITool,
  handoffToHumanTool as AITool,
];

export const TOOL_REGISTRY = new Map(ALL_TOOLS.map((tool) => [tool.name, tool]));

export function resolveTools(allowedNames: string[]): AITool[] {
  return allowedNames
    .map((name) => TOOL_REGISTRY.get(name))
    .filter((tool): tool is AITool => Boolean(tool));
}

/**
 * Executa uma tool com validação de input e isolamento de erro.
 *
 * O modelo pode alucinar argumentos; por isso o input passa pelo schema Zod
 * antes de qualquer acesso ao banco. Erro de tool volta como resultado
 * estruturado, nunca como exceção que derrubaria a conversa.
 */
export async function executeTool(
  tool: AITool,
  rawInput: unknown,
  context: ToolContext
): Promise<ToolResult> {
  const toolLog = log.child({
    companyId: context.companyId,
    conversationId: context.conversationId,
    tool: tool.name,
  });

  const parsed = tool.inputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    toolLog.warn("tool.invalid_input");
    return err("Parâmetros inválidos para esta ferramenta.");
  }

  try {
    const result = await tool.execute(parsed.data, context);
    toolLog.info("tool.executed", { success: result.ok });
    return result;
  } catch (error) {
    toolLog.error("tool.failed", error);
    return err("Não foi possível executar esta ferramenta agora.");
  }
}
