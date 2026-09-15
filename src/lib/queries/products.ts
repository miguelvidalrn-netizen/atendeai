import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export async function listProductsByCompany(companyId: string) {
  return db
    .select()
    .from(products)
    .where(eq(products.companyId, companyId))
    .orderBy(desc(products.createdAt));
}

export async function getProductById(productId: string, companyId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product || product.companyId !== companyId) return null;
  return product;
}
