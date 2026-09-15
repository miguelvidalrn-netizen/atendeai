import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { companies, memberships } from "@/db/schema";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { can, type Permission, type Role } from "@/lib/auth/rbac";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
};

export type CompanyScope = {
  user: AuthenticatedUser;
  company: typeof companies.$inferSelect;
  role: Role;
};

/**
 * Resolve a sessão uma única vez por request.
 *
 * `cache()` do React deduplica a chamada dentro do mesmo render: antes,
 * layout e página chamavam `auth()` + query de empresa de forma independente,
 * dobrando o trabalho em todas as telas do dashboard.
 */
const getSession = cache(async () => auth());

/**
 * Resolve o vínculo do usuário com uma empresa E o papel dele.
 *
 * Ordem de resolução:
 * 1. `memberships` — modelo multi-usuário (preparado para equipes);
 * 2. `companies.owner_id` — dono da conta, tratado como OWNER.
 *
 * O companyId SEMPRE sai daqui, derivado da sessão do servidor. Nenhuma
 * camada acima aceita companyId vindo do cliente.
 */
const resolveScope = cache(
  async (userId: string): Promise<{ company: typeof companies.$inferSelect; role: Role } | null> => {
    const [membership] = await db
      .select({ company: companies, role: memberships.role })
      .from(memberships)
      .innerJoin(companies, eq(companies.id, memberships.companyId))
      .where(eq(memberships.userId, userId))
      .limit(1);

    if (membership) {
      return { company: membership.company, role: membership.role };
    }

    const [owned] = await db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, userId))
      .limit(1);

    return owned ? { company: owned, role: "OWNER" } : null;
  }
);

/** Garante sessão. Redireciona para /login se não houver. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const session = await getSession();
  const user = session?.user;

  if (!user?.id) redirect("/login");

  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
  };
}

/**
 * Garante sessão + empresa (onboarding concluído).
 * Redireciona para /onboarding se o usuário ainda não tem empresa.
 */
export async function requireCompany(): Promise<CompanyScope> {
  const user = await requireUser();
  const scope = await resolveScope(user.id);

  if (!scope) redirect("/onboarding");

  return { user, company: scope.company, role: scope.role };
}

/**
 * Garante sessão + empresa + permissão.
 * Diferente dos anteriores, lança ForbiddenError em vez de redirecionar:
 * falta de permissão é erro de domínio, não fluxo de navegação.
 */
export async function requirePermission(
  permission: Permission
): Promise<CompanyScope> {
  const scope = await requireCompany();

  if (!can(scope.role, permission)) {
    throw new ForbiddenError(
      `Papel "${scope.role}" não possui a permissão "${permission}".`
    );
  }

  return scope;
}

/**
 * Versão para contextos sem UI (rotas de API, jobs): não redireciona,
 * lança erro de domínio que o chamador converte em resposta.
 */
export async function requireCompanyOrThrow(): Promise<CompanyScope> {
  const session = await getSession();
  const user = session?.user;

  if (!user?.id) throw new UnauthorizedError();

  const scope = await resolveScope(user.id);
  if (!scope) throw new ForbiddenError("Usuário sem empresa vinculada.");

  return {
    user: { id: user.id, name: user.name ?? "", email: user.email ?? "" },
    company: scope.company,
    role: scope.role,
  };
}

/** Verifica se uma conversa pertence à empresa do escopo atual. */
export async function assertConversationInCompany(
  conversationId: string,
  companyId: string
): Promise<void> {
  const { conversations } = await import("@/db/schema");
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.id, conversationId), eq(conversations.companyId, companyId))
    )
    .limit(1);

  if (!row) throw new ForbiddenError("Conversa fora do escopo da empresa.");
}
