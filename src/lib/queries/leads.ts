import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";

export async function listLeadsByCompany(companyId: string) {
  return db
    .select()
    .from(leads)
    .where(eq(leads.companyId, companyId))
    .orderBy(desc(leads.createdAt));
}
