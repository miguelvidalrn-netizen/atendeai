import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:py-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
            A
          </span>
          <span className="font-display text-lg text-ink">AtendeAI</span>
        </Link>

        <div className="mx-auto w-full max-w-sm py-12">
          <h1 className="font-display text-3xl text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>

        <p className="text-xs text-ink-soft">
          © {new Date().getFullYear()} AtendeAI
        </p>
      </div>

      <div className="hidden flex-col justify-center bg-ink px-16 lg:flex">
        <p className="text-sm font-medium text-coral">
          Conversas que viram vendas
        </p>
        <p className="mt-4 max-w-sm font-display text-3xl leading-snug text-paper">
          Seu negócio atendendo bem, mesmo quando você está ocupado.
        </p>
      </div>
    </div>
  );
}
