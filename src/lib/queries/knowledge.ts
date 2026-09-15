import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeItems } from "@/db/schema";

export async function listKnowledgeByCompany(companyId: string) {
  return db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.companyId, companyId))
    .orderBy(desc(knowledgeItems.createdAt));
}
