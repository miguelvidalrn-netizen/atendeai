import type { Metadata } from "next";
import { requireCompany } from "@/lib/guards";
import { CompanyForm } from "@/components/dashboard/company-form";
import { Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Empresa — AtendeAI",
};

export default async function EmpresaPage() {
  const { company } = await requireCompany();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Informações da empresa"
        description="Esses dados aparecem no painel e servem de contexto para a IA."
      />
      <Card>
        <CompanyForm company={company} />
      </Card>
    </div>
  );
}
