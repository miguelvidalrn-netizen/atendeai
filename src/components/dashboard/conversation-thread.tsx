"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  sendMessageAction,
  generateAIReplyAction,
  type SendMessageState,
} from "@/lib/actions/conversations";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/primitives";

export type ThreadMessage = {
  id: string;
  content: string;
  sender: "CLIENTE" | "EMPRESA" | "IA";
  createdAt: Date;
};

const initialState: SendMessageState = {};

function bubbleClasses(sender: ThreadMessage["sender"]) {
  if (sender === "CLIENTE") {
    return "mr-auto bg-paper text-ink rounded-2xl rounded-tl-sm";
  }
  if (sender === "IA") {
    return "ml-auto bg-violet-soft text-ink rounded-2xl rounded-tr-sm";
  }
  return "ml-auto bg-ink text-paper rounded-2xl rounded-tr-sm";
}

const SENDER_LABEL = {
  CLIENTE: "Cliente",
  EMPRESA: "Atendente",
  IA: "IA",
} as const;

export function ConversationThread({
  conversationId,
  messages,
  aiConfigured,
}: {
  conversationId: string;
  messages: ThreadMessage[];
  aiConfigured: boolean;
}) {
  const [state, formAction] = useActionState(sendMessageAction, initialState);
  const [isGenerating, startTransition] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleGenerate() {
    setAiError(null);
    startTransition(async () => {
      const result = await generateAIReplyAction(conversationId);
      if (!result.ok) setAiError(result.error);
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">
            Nenhuma mensagem nesta conversa ainda.
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex flex-col gap-1">
              <div
                className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed ${bubbleClasses(message.sender)}`}
              >
                {message.content}
              </div>
              <span
                className={`text-[11px] text-ink-soft ${
                  message.sender === "CLIENTE" ? "mr-auto" : "ml-auto"
                }`}
              >
                {SENDER_LABEL[message.sender]} ·{" "}
                {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-line bg-paper-raised p-4">
        {!aiConfigured && (
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="info">IA em modo simulado</Badge>
            <span className="text-xs text-ink-soft">
              Configure AI_API_KEY para respostas reais.
            </span>
          </div>
        )}

        <form ref={formRef} action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="conversationId" value={conversationId} />
          <textarea
            name="content"
            required
            rows={3}
            placeholder="Escreva sua resposta..."
            className="w-full resize-y rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-violet focus:outline-none"
          />

          {state.error && (
            <p className="text-xs font-medium text-coral-dark">{state.error}</p>
          )}
          {aiError && (
            <p className="text-xs font-medium text-coral-dark">{aiError}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pendingLabel="Enviando...">Enviar</SubmitButton>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-violet disabled:opacity-60"
            >
              {isGenerating ? "Gerando..." : "Gerar resposta com IA"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
