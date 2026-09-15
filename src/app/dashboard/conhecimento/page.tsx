import type { Metadata } from "next";
import { requireCompany } from "@/lib/guards";
import { listKnowledgeByCompany } from "@/lib/queries/knowledge";
import { KnowledgeManager } from "@/components/dashboard/knowledge-manager";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Base de conhecimento — AtendeAI",
};

export default async function ConhecimentoPage() {
  const { company } = await requireCompany();
  const items = await listKnowledgeByCompany(company.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Base de conhecimento"
        description="O que a IA precisa saber para responder seus clientes corretamente."
      />
      <KnowledgeManager items={items} />
    </div>
  );
}
