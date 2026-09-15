"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requirePermission } from "@/lib/guards";
import { leadSchema } from "@/lib/validations";
import { runAction, validationErrorFrom, type ActionResult } from "@/lib/action-result";
import { NotFoundError } from "@/lib/errors";
import { emit } from "@/lib/events";
import { deriveKey, withIdempotency } from "@/lib/idempotency";
import { enforceRateLimit } from "@/lib/rate-limit";

export type LeadFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

type LeadStatus = "NOVO" | "EM_CONTATO" | "QUALIFICADO" | "GANHO" | "PERDIDO";

export async function createLeadAction(
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const result = await runAction("lead.create", {}, async () => {
    const { company, user } = await requirePermission("lead:write");

    await enforceRateLimit("lead.create", company.id);

    const parsed = leadSchema.safeParse({
      name: formData.get("name"),
      contact: formData.get("contact") ?? "",
      status: formData.get("status"),
      estimatedValue: formData.get("estimatedValue") ?? "",
      notes: formData.get("notes") ?? "",
    });

    if (!parsed.success) throw validationErrorFrom(parsed.error);

    const { name, contact, status, estimatedValue, notes } = parsed.data;

    // Evita lead duplicado em duplo clique ou retry de rede.
    const { entityId } = await withIdempotency(
      {
        companyId: company.id,
        scope: "lead.create",
        key: deriveKey([name, contact, status]),
      },
      async () => {
        const [lead] = await db
          .insert(leads)
          .values({
            companyId: company.id,
            name,
            contact: contact || null,
            status,
            estimatedValue: estimatedValue ? estimatedValue.replace(",", ".") : null,
            notes: notes || null,
          })
          .returning({ id: leads.id });

        return lead.id;
      }
    );

    await emit(
      "lead.created",
      company.id,
      { leadId: entityId, name, status },
      user.id
    );

    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
  });

  return result.ok
    ? { success: true }
    : { error: result.error, fieldErrors: result.fieldErrors };
}

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus
): Promise<ActionResult> {
  return runAction("lead.update_status", {}, async () => {
    const { company, user } = await requirePermission("lead:write");

    const [current] = await db
      .select({ status: leads.status, estimatedValue: leads.estimatedValue })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.companyId, company.id)))
      .limit(1);

    if (!current) throw new NotFoundError("Lead");
    if (current.status === status) return;

    await db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.companyId, company.id)));

    await emit(
      "lead.status_changed",
      company.id,
      { leadId, from: current.status, to: status },
      user.id
    );

    if (status === "GANHO") {
      await emit(
        "lead.converted",
        company.id,
        { leadId, estimatedValue: current.estimatedValue },
        user.id
      );
    }

    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
  });
}

export async function deleteLeadAction(leadId: string): Promise<ActionResult> {
  return runAction("lead.delete", {}, async () => {
    const { company } = await requirePermission("lead:write");

    const deleted = await db
      .delete(leads)
      .where(and(eq(leads.id, leadId), eq(leads.companyId, company.id)))
      .returning({ id: leads.id });

    if (deleted.length === 0) throw new NotFoundError("Lead");

    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
  });
}
