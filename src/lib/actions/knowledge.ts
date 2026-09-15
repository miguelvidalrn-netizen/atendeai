"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeItems } from "@/db/schema";
import { requirePermission } from "@/lib/guards";
import { knowledgeSchema } from "@/lib/validations";
import { runAction, validationErrorFrom, type ActionResult } from "@/lib/action-result";
import { NotFoundError } from "@/lib/errors";
import { enforceLimit } from "@/lib/billing/limits";
import { emit } from "@/lib/events";

export type KnowledgeFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function createKnowledgeItemAction(
  _prevState: KnowledgeFormState,
  formData: FormData
): Promise<KnowledgeFormState> {
  const result = await runAction("knowledge.create", {}, async () => {
    const { company, user } = await requirePermission("knowledge:write");

    const parsed = knowledgeSchema.safeParse({
      question: formData.get("question"),
      answer: formData.get("answer"),
      category: formData.get("category"),
      active: formData.get("active") === "on",
    });

    if (!parsed.success) throw validationErrorFrom(parsed.error);

    await enforceLimit(company.id, "knowledgeItems");

    const { question, answer, category, active } = parsed.data;

    const [item] = await db
      .insert(knowledgeItems)
      .values({ companyId: company.id, question, answer, category, active })
      .returning({ id: knowledgeItems.id });

    await emit(
      "knowledge.updated",
      company.id,
      { knowledgeItemId: item.id, operation: "created" },
      user.id
    );

    revalidatePath("/dashboard/conhecimento");
    revalidatePath("/dashboard");
  });

  return result.ok
    ? { success: true }
    : { error: result.error, fieldErrors: result.fieldErrors };
}

export async function deleteKnowledgeItemAction(
  itemId: string
): Promise<ActionResult> {
  return runAction("knowledge.delete", {}, async () => {
    const { company, user } = await requirePermission("knowledge:write");

    const deleted = await db
      .delete(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.id, itemId),
          eq(knowledgeItems.companyId, company.id)
        )
      )
      .returning({ id: knowledgeItems.id });

    if (deleted.length === 0) throw new NotFoundError("Item");

    await emit(
      "knowledge.updated",
      company.id,
      { knowledgeItemId: itemId, operation: "deleted" },
      user.id
    );

    revalidatePath("/dashboard/conhecimento");
    revalidatePath("/dashboard");
  });
}

export async function toggleKnowledgeItemAction(
  itemId: string,
  active: boolean
): Promise<ActionResult> {
  return runAction("knowledge.toggle", {}, async () => {
    const { company, user } = await requirePermission("knowledge:write");

    const updated = await db
      .update(knowledgeItems)
      .set({ active, updatedAt: new Date() })
      .where(
        and(
          eq(knowledgeItems.id, itemId),
          eq(knowledgeItems.companyId, company.id)
        )
      )
      .returning({ id: knowledgeItems.id });

    if (updated.length === 0) throw new NotFoundError("Item");

    await emit(
      "knowledge.updated",
      company.id,
      { knowledgeItemId: itemId, operation: active ? "activated" : "deactivated" },
      user.id
    );

    revalidatePath("/dashboard/conhecimento");
  });
}
