"use client";

import { useEffect } from "react";
import Link from "next/link";
import { isAppError } from "@/lib/errors";

/**
 * Error boundary de toda a árvore /dashboard/*.
 *
 * Error boundaries do App Router precisam ser Client Component. `error`
 * chega aqui como o objeto lançado no servidor, mas o Next só serializa
 * `message` e `digest` para o cliente — nunca stack trace nem qualquer
 * outro campo. Ainda assim, tratamos `error.message` como não confiável
 * para exibição: se for um AppError, usamos publicMessage; caso contrário,
 * uma mensagem genérica. Detalhe real fica só no console do navegador,
 * nunca em texto renderizado.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("dashboard.error_boundary", error);
  }, [error]);

  const message = isAppError(error)
    ? error.publicMessage
    : "Algo deu errado ao carregar esta página.";

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-paper-raised px-6 py-16 text-center">
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/10"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-coral" />
      </div>
      <h2 className="mt-5 font-display text-lg text-ink">{message}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Tente novamente. Se o problema continuar, volte para o painel.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-coral px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          Tentar de novo
        </button>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-ink-soft hover:text-ink"
        >
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
