"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { requirePermission, requireUser } from "@/lib/guards";
import { getCompanyByOwnerId } from "@/lib/queries/company";
import { companyUpdateSchema, onboardingSchema } from "@/lib/validations";

export type CompanyFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

function extractCompanyFields(formData: FormData) {
  return {
    name: formData.get("name"),
    segment: formData.get("segment"),
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    description: formData.get("description") ?? "",
    address: formData.get("address") ?? "",
    website: formData.get("website") ?? "",
  };
}

export async function completeOnboardingAction(
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const user = await requireUser();

  const existing = await getCompanyByOwnerId(user.id);
  if (existing) {
    redirect("/dashboard");
  }

  const parsed = onboardingSchema.safeParse(extractCompanyFields(formData));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const { name, segment, phone, whatsapp, description } = parsed.data;

  await db.insert(companies).values({
    ownerId: user.id,
    name,
    segment,
    phone: phone || null,
    whatsapp: whatsapp || null,
    description: description || null,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateCompanyAction(
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  // Alterar dados da empresa exige papel com permissão company:write.
  const { company: existing } = await requirePermission("company:write");

  const parsed = companyUpdateSchema.safeParse(extractCompanyFields(formData));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const { name, segment, phone, whatsapp, description, address, website } =
    parsed.data;

  await db
    .update(companies)
    .set({
      name,
      segment,
      phone: phone || null,
      whatsapp: whatsapp || null,
      description: description || null,
      address: address || null,
      website: website || null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, existing.id));

  revalidatePath("/dashboard/empresa");
  revalidatePath("/dashboard");
  return { success: true };
}
