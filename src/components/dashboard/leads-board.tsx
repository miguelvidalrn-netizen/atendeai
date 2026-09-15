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

export type LeadStatus =
  | "NOVO"
  | "EM_CONTATO"
  | "QUALIFICADO"
  | "GANHO"
  | "PERDIDO";

export type LeadRow = {
  id: string;
  name: string;
  contact: string | null;
  status: LeadStatus;
  estimatedValue: string | null;
  notes: string | null;
};

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "NOVO", label: "Novo" },
  { value: "EM_CONTATO", label: "Em contato" },
  { value: "QUALIFICADO", label: "Qualificado" },
  { value: "GANHO", label: "Ganho" },
  { value: "PERDIDO", label: "Perdido" },
];

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

function LeadCard({ lead }: { lead: LeadRow }) {
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
    </div>
  );
}

export function LeadsBoard({ leads }: { leads: LeadRow[] }) {
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
                    <LeadCard key={lead.id} lead={lead} />
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
