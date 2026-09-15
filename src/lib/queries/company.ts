import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";

/**
 * Retorna a empresa vinculada ao usuário autenticado (relação 1:1 nesta fase).
 */
export async function getCompanyByOwnerId(ownerId: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.ownerId, ownerId))
    .limit(1);

  return company ?? null;
}

export async function getCompanyById(companyId: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  return company ?? null;
}
