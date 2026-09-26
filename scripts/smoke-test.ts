/**
 * Smoke test de integração — roda contra um PostgreSQL real.
 *
 * Diferente do tsc/eslint, isto exercita comportamento em runtime: pipeline
 * de IA, event bus, motor de automações, idempotência, isolamento
 * multi-tenant e memória do cliente. Não substitui testes unitários; é uma
 * rede de segurança rápida para rodar antes de um deploy ou depois de mexer
 * nessas camadas.
 *
 * Não depende de contexto de request do Next (sem `next/navigation` nem
 * `next/cache`), por isso pode rodar fora do servidor via `tsx`.
 *
 * Uso: npm run smoke
 * Carrega variáveis de .env via `node --env-file` (nativo do Node 20.6+),
 * então nenhuma dependência extra (dotenv) é necessária.
 * Requer DATABASE_URL apontando para um banco de teste/dev — NUNCA rode
 * contra produção, pois cria e depois apaga dados.
 */

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  automations,
  companies,
  conversations,
  leads,
  messages,
  users,
  auditLogs,
} from "../src/db/schema";
import { emit } from "../src/lib/events";
import { runAgentOnConversation } from "../src/lib/ai/service";
import { withIdempotency, deriveKey } from "../src/lib/idempotency";
import { getLeadByConversation } from "../src/lib/queries/leads";
import { listAuditLogsByEntity } from "../src/lib/audit";
import { TOOL_REGISTRY, executeTool } from "../src/lib/ai/tools";
import { getMemoryProvider } from "../src/lib/ai/memory";

const results: { name: string; ok: boolean; detail?: string }[] = [];

function check(name: string, condition: boolean, detail?: string) {
  results.push({ name, ok: condition, detail });
  console.log(`${condition ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const suffix = Date.now().toString(36);

  const [userA] = await db
    .insert(users)
    .values({
      name: "Smoke Test A",
      email: `smoke-a-${suffix}@test.local`,
      passwordHash: "not-a-real-hash",
    })
    .returning();

  const [userB] = await db
    .insert(users)
    .values({
      name: "Smoke Test B",
      email: `smoke-b-${suffix}@test.local`,
      passwordHash: "not-a-real-hash",
    })
    .returning();

  const [companyA] = await db
    .insert(companies)
    .values({ ownerId: userA.id, name: "Empresa A", segment: "Loja" })
    .returning();

  const [companyB] = await db
    .insert(companies)
    .values({ ownerId: userB.id, name: "Empresa B", segment: "Loja" })
    .returning();

  const [conversationA] = await db
    .insert(conversations)
    .values({
      companyId: companyA.id,
      customerName: "Cliente Smoke",
      channel: "WEBCHAT",
    })
    .returning();

  await db.insert(messages).values({
    conversationId: conversationA.id,
    content: "Vocês têm o produto X em estoque?",
    sender: "CLIENTE",
  });

  try {
    // ---------------------------------------------------------------------
    // 1. Pipeline de IA (mock provider) — Context Builder → Agent → Tools → Response
    // ---------------------------------------------------------------------
    const reply = await runAgentOnConversation({
      companyId: companyA.id,
      conversationId: conversationA.id,
      actorUserId: null,
    });

    check("IA gera resposta via mock provider", Boolean(reply.content));
    check("Resposta do mock vem marcada isReal=false", reply.isReal === false);

    const messagesAfterReply = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationA.id));
    check(
      "Resposta da IA foi persistida na conversa",
      messagesAfterReply.some((m) => m.sender === "IA")
    );

    // ---------------------------------------------------------------------
    // 2. Idempotência do pipeline de IA — chamar de novo com o mesmo estado
    //    não deve criar uma segunda mensagem de IA.
    // ---------------------------------------------------------------------
    await runAgentOnConversation({
      companyId: companyA.id,
      conversationId: conversationA.id,
      actorUserId: null,
    });

    const messagesAfterRetry = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationA.id));
    const iaMessages = messagesAfterRetry.filter((m) => m.sender === "IA");
    check(
      "Idempotência: retry sem nova mensagem do cliente não duplica resposta da IA",
      iaMessages.length === 1,
      `${iaMessages.length} mensagem(ns) de IA encontradas`
    );

    // ---------------------------------------------------------------------
    // 3. Idempotência genérica — duas chamadas concorrentes com a mesma
    //    chave nunca executam a operação duas vezes.
    //
    //    Promise.all dispara ambas no mesmo tick, então não há garantia de
    //    qual delas "ganha" a reserva da chave — a perdedora pode terminar
    //    replayed (achou o resultado pronto) ou, no caso extremo de
    //    simultaneidade exata, com o erro "operação em andamento" (a chave
    //    foi reservada mas a vencedora ainda não terminou). Ambos os
    //    desfechos são corretos: o que a garantia promete é executions===1,
    //    nunca 2 e nunca 0.
    // ---------------------------------------------------------------------
    let executions = 0;
    const idemKey = deriveKey(["smoke-test", suffix]);
    const attempt = (label: string) =>
      withIdempotency({ companyId: companyA.id, scope: "smoke.test", key: idemKey }, async () => {
        executions += 1;
        return label;
      });

    const [r1, r2] = await Promise.allSettled([attempt("entity-1"), attempt("entity-2")]);

    const fulfilled = [r1, r2].filter(
      (r): r is PromiseFulfilledResult<{ entityId: string; replayed: boolean }> =>
        r.status === "fulfilled"
    );
    const rejected = [r1, r2].filter((r) => r.status === "rejected");

    check(
      "Idempotência genérica: operação concorrente executa só uma vez",
      executions === 1,
      `executions=${executions}`
    );
    check(
      "Idempotência genérica: nenhuma chamada falha por motivo inesperado",
      rejected.every(
        (r) => r.status === "rejected" && String(r.reason).includes("em andamento")
      ),
      rejected.length > 0 ? `${rejected.length} chamada(s) no caminho 'em andamento'` : "sem rejeições"
    );
    check(
      "Idempotência genérica: resultado consistente entre as chamadas que completaram",
      new Set(fulfilled.map((r) => r.value.entityId)).size <= 1
    );

    // ---------------------------------------------------------------------
    // 4. Event bus + Audit log — emitir evento real e checar gravação.
    // ---------------------------------------------------------------------
    const [lead] = await db
      .insert(leads)
      .values({
        companyId: companyA.id,
        conversationId: conversationA.id,
        name: "Cliente Smoke",
        status: "NOVO",
      })
      .returning();

    await emit("lead.created", companyA.id, {
      leadId: lead.id,
      name: lead.name,
      status: "NOVO",
      conversationId: conversationA.id,
    });

    const auditRows = await listAuditLogsByEntity(companyA.id, "lead");
    check(
      "Event bus → Audit log: lead.created foi auditado",
      auditRows.some((row) => row.entityId === lead.id && row.action === "lead.created")
    );

    // ---------------------------------------------------------------------
    // 5. Motor de automações — trigger → condition → action de verdade.
    // ---------------------------------------------------------------------
    await db.insert(automations).values({
      companyId: companyA.id,
      name: "Smoke: mover lead novo para em contato",
      trigger: "lead.status_changed",
      conditions: [{ path: "to", operator: "eq", value: "EM_CONTATO" }],
      actions: [{ type: "audit.note", note: "Automação de smoke test executada" }],
      enabled: true,
    });

    await emit("lead.status_changed", companyA.id, {
      leadId: lead.id,
      from: "NOVO",
      to: "EM_CONTATO",
    });

    const automationAudit = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.companyId, companyA.id));
    check(
      "Motor de automações: condition bateu e action rodou de verdade",
      automationAudit.some(
        (row) =>
          row.action === "automation.note" &&
          (row.metadata as { note?: string } | null)?.note ===
            "Automação de smoke test executada"
      )
    );

    // ---------------------------------------------------------------------
    // 6. Memória do cliente — a tool updateLead deve gravar um resumo que
    //    uma conversa futura do mesmo cliente conseguirá recuperar.
    // ---------------------------------------------------------------------
    const updateLeadTool = TOOL_REGISTRY.get("updateLead");
    if (!updateLeadTool) throw new Error("Tool updateLead não registrada.");

    const customerKey = conversationA.customerContact ?? conversationA.id;

    const toolResult = await executeTool(
      updateLeadTool,
      { status: "EM_CONTATO", notes: "Perguntou sobre prazo de entrega." },
      {
        companyId: companyA.id,
        conversationId: conversationA.id,
        actorUserId: null,
        customerKey,
      }
    );
    check("Tool updateLead executa via TOOL_REGISTRY", toolResult.ok);

    const savedMemory = await getMemoryProvider().getCustomerMemory(companyA.id, customerKey);
    check(
      "Memória do cliente: tool de lead grava resumo recuperável",
      Boolean(savedMemory?.summary?.includes("EM_CONTATO"))
    );

    // ---------------------------------------------------------------------
    // 7. Isolamento multi-tenant — Empresa B não pode ver dados da Empresa A.
    // ---------------------------------------------------------------------
    const leadFromWrongTenant = await getLeadByConversation(conversationA.id, companyB.id);
    check(
      "Multi-tenant: lead da empresa A é invisível para a empresa B",
      leadFromWrongTenant === null
    );

    const leadFromRightTenant = await getLeadByConversation(conversationA.id, companyA.id);
    check(
      "Multi-tenant: lead da empresa A é visível para a própria empresa A",
      leadFromRightTenant?.id === lead.id
    );

    let crossTenantBlocked = false;
    try {
      await runAgentOnConversation({
        companyId: companyB.id,
        conversationId: conversationA.id,
        actorUserId: null,
      });
    } catch {
      crossTenantBlocked = true;
    }
    check(
      "Multi-tenant: pipeline de IA recusa conversa de outra empresa",
      crossTenantBlocked
    );

    const memoryFromWrongTenant = await getMemoryProvider().getCustomerMemory(
      companyB.id,
      customerKey
    );
    check(
      "Multi-tenant: memória do cliente da empresa A é invisível para a empresa B",
      memoryFromWrongTenant === null
    );
  } finally {
    await db.delete(companies).where(eq(companies.id, companyA.id));
    await db.delete(companies).where(eq(companies.id, companyB.id));
    await db.delete(users).where(eq(users.id, userA.id));
    await db.delete(users).where(eq(users.id, userB.id));
  }

  const failed = results.filter((r) => !r.ok);
  console.log("");
  console.log(`${results.length - failed.length}/${results.length} verificações passaram.`);

  if (failed.length > 0) {
    console.error(`${failed.length} verificação(ões) falharam.`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Smoke test falhou com erro não tratado:", error);
    process.exit(1);
  });
