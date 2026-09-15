"use client";

import { useActionState, useRef, useState } from "react";
import { InlineError, useRowAction } from "@/components/ui/inline-error";
import {
  createKnowledgeItemAction,
  deleteKnowledgeItemAction,
  toggleKnowledgeItemAction,
  type KnowledgeFormState,
} from "@/lib/actions/knowledge";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge, EmptyState } from "@/components/ui/primitives";

export type KnowledgeCategory =
  | "FAQ"
  | "POLITICA"
  | "HORARIO"
  | "ENTREGA"
  | "PAGAMENTO"
  | "OUTRO";

export type KnowledgeRow = {
  id: string;
  question: string;
  answer: string;
  category: KnowledgeCategory;
  active: boolean;
};

const CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: "FAQ", label: "Pergunta frequente" },
  { value: "POLITICA", label: "Política" },
  { value: "HORARIO", label: "Horário" },
  { value: "ENTREGA", label: "Entrega" },
  { value: "PAGAMENTO", label: "Pagamento" },
  { value: "OUTRO", label: "Outro" },
];

const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((category) => [category.value, category.label])
) as Record<KnowledgeCategory, string>;

const initialState: KnowledgeFormState = {};

function KnowledgeItem({ item }: { item: KnowledgeRow }) {
  const { isPending, error, run } = useRowAction();

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{CATEGORY_LABEL[item.category]}</Badge>
        {!item.active && <Badge tone="neutral">Inativo</Badge>}
      </div>
      <p className="mt-2 font-medium text-ink">{item.question}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.answer}</p>

      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => toggleKnowledgeItemAction(item.id, !item.active))}
          className="text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-60"
        >
          {item.active ? "Desativar" : "Ativar"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => deleteKnowledgeItemAction(item.id))}
          className="text-sm font-medium text-ink-soft hover:text-coral-dark disabled:opacity-60"
        >
          Excluir
        </button>
      </div>
      <InlineError message={error} />
    </li>
  );
}

export function KnowledgeManager({ items }: { items: KnowledgeRow[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState(
    async (prev: KnowledgeFormState, formData: FormData) => {
      const result = await createKnowledgeItemAction(prev, formData);
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
          {open ? "Cancelar" : "Adicionar informação"}
        </button>
      </div>

      {open && (
        <div className="rounded-2xl border border-line bg-paper-raised p-6">
          <h2 className="font-display text-lg text-ink">Nova informação</h2>
          <form
            ref={formRef}
            action={formAction}
            className="mt-5 flex flex-col gap-4"
          >
            <Field
              label="Pergunta ou título"
              name="question"
              placeholder="Ex: Vocês entregam em toda a cidade?"
              error={state.fieldErrors?.question}
              required
            />

            <Field
              as="textarea"
              label="Resposta"
              name="answer"
              placeholder="A resposta que a IA deve dar nessa situação."
              error={state.fieldErrors?.answer}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-sm font-medium text-ink">
                Categoria
              </label>
              <select
                id="category"
                name="category"
                defaultValue="FAQ"
                className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-violet focus:outline-none"
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="active"
                defaultChecked
                className="h-4 w-4 rounded border-line"
              />
              Usar esta informação no atendimento
            </label>

            <SubmitButton pendingLabel="Salvando...">Salvar</SubmitButton>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Base de conhecimento vazia"
          description="Cadastre perguntas frequentes, políticas de troca, horários e regras de entrega. A IA consulta essas informações antes de responder um cliente."
        />
      ) : (
        <div className="rounded-2xl border border-line bg-paper-raised px-6">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <KnowledgeItem key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
