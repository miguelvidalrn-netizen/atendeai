"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requirePermission } from "@/lib/guards";
import { productSchema } from "@/lib/validations";
import { runAction, validationErrorFrom, type ActionResult } from "@/lib/action-result";
import { NotFoundError } from "@/lib/errors";
import { enforceLimit } from "@/lib/billing/limits";
import { emit } from "@/lib/events";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price") ?? "",
    type: formData.get("type"),
    active: formData.get("active") === "on",
  });
}

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const result = await runAction("product.create", {}, async () => {
    const { company, user } = await requirePermission("product:write");

    const parsed = parseProductForm(formData);
    if (!parsed.success) throw validationErrorFrom(parsed.error);

    await enforceLimit(company.id, "products");

    const { name, description, price, type, active } = parsed.data;

    const [product] = await db
      .insert(products)
      .values({
        companyId: company.id,
        name,
        description: description || null,
        price: price ? price.replace(",", ".") : null,
        type,
        active,
      })
      .returning({ id: products.id });

    await emit(
      "product.updated",
      company.id,
      { productId: product.id, operation: "created" },
      user.id
    );

    revalidatePath("/dashboard/produtos");
    revalidatePath("/dashboard");
  });

  return result.ok
    ? { success: true }
    : { error: result.error, fieldErrors: result.fieldErrors };
}

export async function updateProductAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const result = await runAction("product.update", {}, async () => {
    const { company, user } = await requirePermission("product:write");

    const parsed = parseProductForm(formData);
    if (!parsed.success) throw validationErrorFrom(parsed.error);

    const { name, description, price, type, active } = parsed.data;

    const updated = await db
      .update(products)
      .set({
        name,
        description: description || null,
        price: price ? price.replace(",", ".") : null,
        type,
        active,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.companyId, company.id)))
      .returning({ id: products.id });

    if (updated.length === 0) throw new NotFoundError("Produto");

    await emit(
      "product.updated",
      company.id,
      { productId, operation: "updated" },
      user.id
    );

    revalidatePath("/dashboard/produtos");
  });

  return result.ok
    ? { success: true }
    : { error: result.error, fieldErrors: result.fieldErrors };
}

export async function deleteProductAction(
  productId: string
): Promise<ActionResult> {
  return runAction("product.delete", {}, async () => {
    const { company, user } = await requirePermission("product:write");

    const deleted = await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.companyId, company.id)))
      .returning({ id: products.id });

    if (deleted.length === 0) throw new NotFoundError("Produto");

    await emit(
      "product.updated",
      company.id,
      { productId, operation: "deleted" },
      user.id
    );

    revalidatePath("/dashboard/produtos");
    revalidatePath("/dashboard");
  });
}

export async function toggleProductActiveAction(
  productId: string,
  active: boolean
): Promise<ActionResult> {
  return runAction("product.toggle", {}, async () => {
    const { company, user } = await requirePermission("product:write");

    const updated = await db
      .update(products)
      .set({ active, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.companyId, company.id)))
      .returning({ id: products.id });

    if (updated.length === 0) throw new NotFoundError("Produto");

    await emit(
      "product.updated",
      company.id,
      { productId, operation: active ? "activated" : "deactivated" },
      user.id
    );

    revalidatePath("/dashboard/produtos");
  });
}
