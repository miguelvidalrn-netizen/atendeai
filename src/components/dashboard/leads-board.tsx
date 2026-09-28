"use client";

import { useActionState, useRef, useState } from "react";
import { InlineError, useRowAction } from "@/components/ui/inline-error";
import {
  createLeadAction,
  deleteLeadAction,
  updateLeadStatusAction,
  type LeadFormState,
} from "@/lib/actions/leads";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/primitives";
import type { AuditLogRow } from "@/lib/audit";

export type LeadStatus =
  | "NOVO"
  | "EM_CONTATO"
  | "QUALIFICADO"
  | "GANHO"
  | "PERDIDO";

export type LeadChannel = "WEBCHAT" | "WHATSAPP" | "INSTAGRAM" | "OUTRO" | null;

export type LeadRow = {
  id: string;
  name: string;
  contact: string | null;
  status: LeadStatus;
  estimatedValue: string | null;
  notes: string | null;
  conversationId: string | null;
  updatedAt: Date;
  /** Canal da conversa que originou o lead. Nulo quando criado manualmente. */
  channel: LeadChannel;
};

// Vocabulário de status do produto. Os valores gravados no banco (EM_CONTATO,
// QUALIFICADO, GANHO) não mudam — só o rótulo exibido, para não exigir
// migração nem tocar em nenhuma outra parte que já depende desses valores
// (tools de IA, automações, filtros).
const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "NOVO", label: "Novo" },
  { value: "EM_CONTATO", label: "Em atendimento" },
  { value: "QUALIFICADO", label: "Interessado" },
  { value: "GANHO", label: "Convertido" },
  { value: "PERDIDO", label: "Perdido" },
];

const STATUS_LABEL_BY_VALUE = Object.fromEntries(
  STATUSES.map((status) => [status.value, status.label])
) as Record<LeadStatus, string>;

const CHANNEL_LABEL: Record<NonNullable<LeadChannel>, string> = {
  WEBCHAT: "Webchat",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  OUTRO: "Outro",
};

function formatRelativeDate(date: Date) {
  const value = new Date(date);
  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "agora há pouco";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `há ${diffDays}d`;

  return value.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const initialState: LeadFormState = {};

function formatValue(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatAuditEntry(row: AuditLogRow): string {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;

  switch (row.action) {
    case "lead.created":
      return "Lead criado";
    case "lead.status_changed": {
      const from = STATUS_LABEL_BY_VALUE[metadata.from as LeadStatus] ?? metadata.from;
      const to = STATUS_LABEL_BY_VALUE[metadata.to as LeadStatus] ?? metadata.to;
      return `Status alterado: ${from} → ${to}`;
    }
    case "lead.converted":
      return "Marcado como convertido";
    case "automation.note":
      return typeof metadata.note === "string" ? metadata.note : "Ação de automação";
    default:
      return row.action;
  }
}

function LeadHistory({ entries }: { entries: AuditLogRow[] }) {
  if (entries.length === 0) return null;

  return (
    <details className="mt-2 text-[11px] text-ink-soft">
      <summary className="cursor-pointer font-medium text-ink hover:text-coral">
        Histórico ({entries.length})
      </summary>
      <ul className="mt-1.5 flex flex-col gap-1 border-l border-line pl-2.5">
        {entries.slice(0, 5).map((entry) => (
          <li key={entry.id}>
            {formatAuditEntry(entry)} · {formatRelativeDate(entry.createdAt)}
          </li>
        ))}
      </ul>
    </details>
  );
}

function LeadCard({
  lead,
  history,
}: {
  lead: LeadRow;
  history: AuditLogRow[];
}) {
  const { isPending, error, run } = useRowAction();
  const value = formatValue(lead.estimatedValue);

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{lead.name}</p>
          {lead.contact && (
            <p className="truncate text-xs text-ink-soft">{lead.contact}</p>
          )}
        </div>
        {value && (
          <span className="shrink-0 text-sm font-semibold text-ink">
            {value}
          </span>
        )}
      </div>

      {lead.notes && (
        <p className="mt-2 line-clamp-2 text-xs text-ink-soft">{lead.notes}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
        <span>
          Origem: {lead.channel ? CHANNEL_LABEL[lead.channel] : "Manual"}
        </span>
        <span>Última interação: {formatRelativeDate(lead.updatedAt)}</span>
        {lead.conversationId && (
          <a
            href={`/dashboard/conversas/${lead.conversationId}`}
            className="font-medium text-ink underline decoration-line underline-offset-2 hover:text-coral"
          >
            Ver conversa
          </a>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <select
          value={lead.status}
          disabled={isPending}
          onChange={(event) =>
            run(() =>
              updateLeadStatusAction(lead.id, event.target.value as LeadStatus)
            )
          }
          aria-label={`Status de ${lead.name}`}
          className="flex-1 rounded-lg border border-line bg-paper-raised px-2 py-1.5 text-xs text-ink focus:border-violet focus:outline-none"
        >
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => deleteLeadAction(lead.id))}
          className="text-xs font-medium text-ink-soft hover:text-coral-dark disabled:opacity-60"
        >
          Excluir
        </button>
      </div>
      <InlineError message={error} />
      <LeadHistory entries={history} />
    </div>
  );
}

export function LeadsBoard({
  leads,
  historyByLead,
}: {
  leads: LeadRow[];
  historyByLead: Map<string, AuditLogRow[]>;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState(
    async (prev: LeadFormState, formData: FormData) => {
      const result = await createLeadAction(prev, formData);
      if (result.success) {
        formRef.current?.reset();
        setOpen(false);
      }
      return result;
    },
    initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen((value) => !value)}
          className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          {open ? "Cancelar" : "Adicionar lead"}
        </button>
      </div>

      {open && (
        <div className="rounded-2xl border border-line bg-paper-raised p-6">
          <h2 className="font-display text-lg text-ink">Novo lead</h2>
          <form
            ref={formRef}
            action={formAction}
            className="mt-5 flex flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nome"
                name="name"
                placeholder="Ex: Maria Souza"
                error={state.fieldErrors?.name}
                required
              />
              <Field
                label="Contato"
                name="contact"
                placeholder="Telefone ou e-mail"
                error={state.fieldErrors?.contact}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Valor estimado (R$)"
                name="estimatedValue"
                placeholder="500,00"
                error={state.fieldErrors?.estimatedValue}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="status" className="text-sm font-medium text-ink">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue="NOVO"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-violet focus:outline-none"
                >
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Field
              as="textarea"
              label="Observações"
              name="notes"
              placeholder="O que esse cliente procura?"
              error={state.fieldErrors?.notes}
            />

            <SubmitButton pendingLabel="Salvando...">Salvar lead</SubmitButton>
          </form>
        </div>
      )}

      {leads.length === 0 ? (
        <EmptyState
          title="Nenhum lead ainda"
          description="Leads são as oportunidades de venda do seu negócio. Adicione manualmente ou gere a partir de uma conversa."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STATUSES.map((status) => {
            const columnLeads = leads.filter(
              (lead) => lead.status === status.value
            );
            if (columnLeads.length === 0) return null;

            return (
              <section
                key={status.value}
                className="rounded-2xl border border-line bg-paper-raised p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-base text-ink">
                    {status.label}
                  </h3>
                  <span className="text-xs text-ink-soft">
                    {columnLeads.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {columnLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      history={historyByLead.get(lead.id) ?? []}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
