"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";

/**
 * Hook para ações de linha (excluir, ativar, mudar status).
 *
 * Antes essas ações não tinham nenhum retorno visível: se falhassem —
 * inclusive por falta de permissão — o usuário não via nada. Agora todas
 * expõem estado de carregamento e mensagem de erro.
 */
export function useRowAction() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult<unknown>>) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  return { isPending, error, run };
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-coral-dark">
      {message}
    </p>
  );
}
