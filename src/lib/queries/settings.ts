import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiSettings, subscriptions } from "@/db/schema";

export async function getAISettings(companyId: string) {
  const [settings] = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.companyId, companyId))
    .limit(1);

  return settings ?? null;
}

export async function getSubscription(companyId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.companyId, companyId))
    .limit(1);

  return subscription ?? null;
}
