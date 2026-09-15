import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl text-ink sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-ink-soft">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-paper-raised p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-paper-raised px-6 py-16 text-center">
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-soft"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-violet" />
      </div>
      <h3 className="mt-5 font-display text-lg text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-paper text-ink-soft border-line",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-coral/10 text-coral-dark border-coral/20",
  info: "bg-violet-soft text-ink border-violet/20",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Marca visual para dados de demonstração — nunca apresentar mock como real. */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet-soft px-2.5 py-0.5 text-xs font-medium text-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-violet" />
      Demonstração
    </span>
  );
}
