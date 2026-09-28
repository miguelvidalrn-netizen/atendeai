import type { Metadata } from "next";
import { requireCompany } from "@/lib/guards";
import { listLeadsByCompany } from "@/lib/queries/leads";
import { listAuditLogsByEntity, type AuditLogRow } from "@/lib/audit";
import { LeadsBoard } from "@/components/dashboard/leads-board";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Leads — AtendeAI",
};

export default async function LeadsPage() {
  const { company } = await requireCompany();
  const [leads, auditRows] = await Promise.all([
    listLeadsByCompany(company.id),
    // Uma única query para todos os leads da empresa; agrupada por
    // entityId abaixo, em vez de uma query de auditoria por card.
    listAuditLogsByEntity(company.id, "lead"),
  ]);

  const historyByLead = new Map<string, AuditLogRow[]>();
  for (const row of auditRows) {
    if (!row.entityId) continue;
    const existing = historyByLead.get(row.entityId) ?? [];
    existing.push(row);
    historyByLead.set(row.entityId, existing);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leads"
        description="As oportunidades de venda que saem das suas conversas."
      />
      <LeadsBoard leads={leads} historyByLead={historyByLead} />
    </div>
  );
}
