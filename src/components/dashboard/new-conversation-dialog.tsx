"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createConversationAction,
  type ConversationFormState,
} from "@/lib/actions/conversations";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ConversationFormState = {};

const CHANNELS = [
  { value: "WEBCHAT", label: "Webchat" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "OUTRO", label: "Outro" },
];

export function NewConversationDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [state, formAction] = useActionState(
    async (prev: ConversationFormState, formData: FormData) => {
      const result = await createConversationAction(prev, formData);
      if (result.success && result.conversationId) {
        setOpen(false);
        router.push(`/dashboard/conversas/${result.conversationId}`);
      }
      return result;
    },
    initialState
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
      >
        Registrar conversa
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-paper-raised p-6 sm:max-w-md sm:rounded-3xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl text-ink">
                  Registrar conversa
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Use para acompanhar um atendimento que começou em outro canal.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-2xl leading-none text-ink-soft"
              >
                ×
              </button>
            </div>

            <form action={formAction} className="mt-6 flex flex-col gap-4">
              <Field
                label="Nome do cliente"
                name="customerName"
                placeholder="Ex: Maria Souza"
                error={state.fieldErrors?.customerName}
                required
              />
              <Field
                label="Contato"
                name="customerContact"
                placeholder="Telefone, e-mail ou @usuario"
                error={state.fieldErrors?.customerContact}
              />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="channel" className="text-sm font-medium text-ink">
                  Canal
                </label>
                <select
                  id="channel"
                  name="channel"
                  defaultValue="WHATSAPP"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-violet focus:outline-none"
                >
                  {CHANNELS.map((channel) => (
                    <option key={channel.value} value={channel.value}>
                      {channel.label}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                as="textarea"
                label="Primeira mensagem do cliente"
                name="firstMessage"
                placeholder="O que o cliente perguntou?"
                error={state.fieldErrors?.firstMessage}
                required
              />

              {state.error && !state.fieldErrors && (
                <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral-dark">
                  {state.error}
                </p>
              )}

              <SubmitButton pendingLabel="Salvando...">
                Criar conversa
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
