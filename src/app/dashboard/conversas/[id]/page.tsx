import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCompany } from "@/lib/guards";
import {
  getConversationById,
  listMessagesByConversation,
} from "@/lib/queries/conversations";
import { isAIConfigured } from "@/lib/ai/service";
import { ConversationThread } from "@/components/dashboard/conversation-thread";
import { Badge } from "@/components/ui/primitives";
import { CloseConversationButton } from "@/components/dashboard/close-conversation-button";

export const metadata: Metadata = {
  title: "Conversa — AtendeAI",
};

const CHANNEL_LABEL = {
  WEBCHAT: "Webchat",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  OUTRO: "Outro",
} as const;

const STATUS_LABEL = {
  ABERTA: "Aberta",
  ATENDIDA: "Atendida",
  FECHADA: "Fechada",
} as const;

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await requireCompany();

  // Busca já filtrada por companyId — impede acesso a conversa de outra empresa.
  const conversation = await getConversationById(id, company.id);
  if (!conversation) {
    notFound();
  }

  const messages = await listMessagesByConversation(conversation.id);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/conversas"
        className="text-sm font-medium text-ink-soft hover:text-ink"
      >
        ← Voltar para conversas
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">
            {conversation.customerName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={conversation.status === "FECHADA" ? "neutral" : "info"}>
              {STATUS_LABEL[conversation.status]}
            </Badge>
            <span className="text-sm text-ink-soft">
              {CHANNEL_LABEL[conversation.channel]}
            </span>
            {conversation.customerContact && (
              <span className="text-sm text-ink-soft">
                · {conversation.customerContact}
              </span>
            )}
          </div>
        </div>

        {conversation.status !== "FECHADA" && (
          <CloseConversationButton conversationId={conversation.id} />
        )}
      </div>

      <div className="flex h-[60vh] min-h-96 overflow-hidden rounded-2xl border border-line bg-paper-raised">
        <ConversationThread
          conversationId={conversation.id}
          messages={messages}
          aiConfigured={isAIConfigured()}
        />
      </div>
    </div>
  );
}
