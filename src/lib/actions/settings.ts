"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { requirePermission } from "@/lib/guards";
import { aiSettingsSchema } from "@/lib/validations";
import { toFieldErrors } from "@/lib/form-errors";

export type SettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function updateAISettingsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const { company } = await requirePermission("ai_settings:write");

  const parsed = aiSettingsSchema.safeParse({
    tone: formData.get("tone"),
    rules: formData.get("rules") ?? "",
    businessHours: formData.get("businessHours") ?? "",
    autoReplyEnabled: formData.get("autoReplyEnabled") === "on",
  });

  if (!parsed.success) {
    return {
      error: "Verifique os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { tone, rules, businessHours, autoReplyEnabled } = parsed.data;

  const values = {
    tone,
    rules: rules || null,
    businessHours: businessHours || null,
    autoReplyEnabled,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: aiSettings.id })
    .from(aiSettings)
    .where(eq(aiSettings.companyId, company.id))
    .limit(1);

  if (existing) {
    await db
      .update(aiSettings)
      .set(values)
      .where(eq(aiSettings.companyId, company.id));
  } else {
    await db.insert(aiSettings).values({ companyId: company.id, ...values });
  }

  revalidatePath("/dashboard/configuracoes");
  return { success: true };
}
