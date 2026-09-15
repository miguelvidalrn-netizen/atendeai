import type { Metadata } from "next";
import { requireCompany } from "@/lib/guards";
import { listProductsByCompany } from "@/lib/queries/products";
import { ProductManager } from "@/components/dashboard/product-manager";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Produtos e serviços — AtendeAI",
};

export default async function ProdutosPage() {
  const { company } = await requireCompany();
  const products = await listProductsByCompany(company.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produtos e serviços"
        description="O catálogo que a IA usa para responder e vender."
      />
      <ProductManager products={products} />
    </div>
  );
}
