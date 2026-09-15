import type { Metadata } from "next";
import { requireCompany } from "@/lib/guards";
import { listInbox } from "@/lib/queries/inbox";
import { InboxList } from "@/components/dashboard/inbox-list";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { NewConversationDialog } from "@/components/dashboard/new-conversation-dialog";

export const metadata: Metadata = {
  title: "Conversas — AtendeAI",
};

export default async function ConversasPage() {
  const { company } = await requireCompany();
  const items = await listInbox(company.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Central de conversas"
        description="Acompanhe e responda seus clientes em um só lugar."
        action={<NewConversationDialog />}
      />

      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma conversa ainda"
          description="Quando um cliente entrar em contato, a conversa aparece aqui. Você também pode registrar um atendimento manualmente para testar o fluxo."
          action={<NewConversationDialog />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised">
          <InboxList items={items} />
        </div>
      )}
    </div>
  );
}
