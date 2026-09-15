"use client";

import { useState, useTransition } from "react";
import { closeConversationAction } from "@/lib/actions/conversations";

export function CloseConversationButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await closeConversationAction(conversationId);
            if (!result.ok) setError(result.error);
          })
        }
        className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-coral hover:text-coral-dark disabled:opacity-60"
      >
        {isPending ? "Fechando..." : "Fechar conversa"}
      </button>
      {error && (
        <p role="alert" className="text-xs font-medium text-coral-dark">
          {error}
        </p>
      )}
    </div>
  );
}
