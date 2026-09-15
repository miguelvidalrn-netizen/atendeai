import type { Metadata } from "next";
import { requireCompany } from "@/lib/guards";
import { listLeadsByCompany } from "@/lib/queries/leads";
import { LeadsBoard } from "@/components/dashboard/leads-board";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Leads — AtendeAI",
};

export default async function LeadsPage() {
  const { company } = await requireCompany();
  const leads = await listLeadsByCompany(company.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leads"
        description="As oportunidades de venda que saem das suas conversas."
      />
      <LeadsBoard leads={leads} />
    </div>
  );
}
