"use client";

import { useRowAction, InlineError } from "@/components/ui/inline-error";
import { updateLeadStatusAction } from "@/lib/actions/leads";
import { Badge } from "@/components/ui/primitives";

type LeadStatus = "NOVO" | "EM_CONTATO" | "QUALIFICADO" | "GANHO" | "PERDIDO";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "NOVO", label: "Novo" },
  { value: "EM_CONTATO", label: "Em atendimento" },
  { value: "QUALIFICADO", label: "Interessado" },
  { value: "GANHO", label: "Convertido" },
  { value: "PERDIDO", label: "Perdido" },
];

export type LeadContext = {
  id: string;
  status: LeadStatus;
  estimatedValue: string | null;
  notes: string | null;
};

/**
 * Painel compacto mostrado junto da conversa quando ela já gerou um lead.
 * Fecha o ciclo Conversa → CRM: dá pra ver e ajustar o status sem sair
 * do atendimento.
 */
export function LeadContextPanel({ lead }: { lead: LeadContext }) {
  const { isPending, error, run } = useRowAction();

  const value = lead.estimatedValue ? Number(lead.estimatedValue) : null;
  const formattedValue =
    value !== null && !Number.isNaN(value)
      ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-violet-soft/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink">
          Oportunidade vinculada
        </span>
        {formattedValue && <Badge tone="info">{formattedValue}</Badge>}
      </div>

      <select
        value={lead.status}
        disabled={isPending}
        onChange={(event) =>
          run(() => updateLeadStatusAction(lead.id, event.target.value as LeadStatus))
        }
        aria-label="Status do lead"
        className="w-full rounded-lg border border-line bg-paper-raised px-2 py-1.5 text-xs text-ink focus:border-violet focus:outline-none"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {lead.notes && (
        <p className="line-clamp-2 text-xs text-ink-soft">{lead.notes}</p>
      )}

      <InlineError message={error} />

      <a
        href="/dashboard/leads"
        className="text-xs font-medium text-ink underline decoration-line underline-offset-2 hover:text-coral"
      >
        Ver todos os leads
      </a>
    </div>
  );
}
