import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { conversations, knowledgeItems, products, subscriptions } from "@/db/schema";
import { LimitReachedError } from "@/lib/errors";
import { getPlan, type PlanId } from "@/lib/plans";

/**
 * Verificação de limites por plano.
 *
 * Os limites já existiam declarados em `lib/plans.ts`; o que faltava era
 * quem os fizesse valer. Aqui eles viram checagem real, sem nenhum
 * acoplamento a gateway de pagamento.
 */

export type LimitKind = "conversationsPerMonth" | "products" | "knowledgeItems";

/** Plano vigente da empresa. Sem assinatura registrada, assume STARTER. */
export async function getCompanyPlan(companyId: string): Promise<PlanId> {
  const [subscription] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.companyId, companyId))
    .limit(1);

  if (!subscription || subscription.status !== "ATIVA") return "STARTER";
  return subscription.plan;
}

async function currentUsage(companyId: string, kind: LimitKind): Promise<number> {
  if (kind === "products") {
    const [row] = await db
      .select({ value: count() })
      .from(products)
      .where(eq(products.companyId, companyId));
    return row?.value ?? 0;
  }

  if (kind === "knowledgeItems") {
    const [row] = await db
      .select({ value: count() })
      .from(knowledgeItems)
      .where(eq(knowledgeItems.companyId, companyId));
    return row?.value ?? 0;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({ value: count() })
    .from(conversations)
    .where(
      and(
        eq(conversations.companyId, companyId),
        gte(conversations.createdAt, startOfMonth)
      )
    );
  return row?.value ?? 0;
}

const LIMIT_LABELS: Record<LimitKind, string> = {
  conversationsPerMonth: "conversas neste mês",
  products: "produtos ou serviços",
  knowledgeItems: "itens na base de conhecimento",
};

export type LimitStatus = {
  kind: LimitKind;
  used: number;
  limit: number | null;
  exceeded: boolean;
};

export async function checkLimit(
  companyId: string,
  kind: LimitKind
): Promise<LimitStatus> {
  const plan = getPlan(await getCompanyPlan(companyId));
  const limit = plan.limits[kind];

  if (limit === null) {
    return { kind, used: 0, limit: null, exceeded: false };
  }

  const used = await currentUsage(companyId, kind);
  return { kind, used, limit, exceeded: used >= limit };
}

/** Lança LimitReachedError se o limite do plano já foi atingido. */
export async function enforceLimit(
  companyId: string,
  kind: LimitKind
): Promise<void> {
  const status = await checkLimit(companyId, kind);

  if (status.exceeded) {
    throw new LimitReachedError(
      `Seu plano permite até ${status.limit} ${LIMIT_LABELS[kind]}. Faça upgrade para continuar.`,
      { kind, used: status.used, limit: status.limit }
    );
  }
}
