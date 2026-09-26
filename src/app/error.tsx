"use client";

import { useEffect } from "react";
import Link from "next/link";
import { isAppError } from "@/lib/errors";

/**
 * Error boundary para tudo fora de /dashboard (landing, login, cadastro,
 * onboarding). /dashboard tem o próprio error.tsx mais específico.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("root.error_boundary", error);
  }, [error]);

  const message = isAppError(error)
    ? error.publicMessage
    : "Algo deu errado ao carregar esta página.";

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-paper px-6 py-24 text-center">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
        A
      </span>
      <h1 className="mt-6 font-display text-2xl text-ink">{message}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Tente novamente em instantes.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-coral px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          Tentar de novo
        </button>
        <Link href="/" className="text-sm font-medium text-ink-soft hover:text-ink">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
