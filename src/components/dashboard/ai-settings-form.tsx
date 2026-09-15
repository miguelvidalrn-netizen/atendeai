"use client";

import { useActionState } from "react";
import {
  updateAISettingsAction,
  type SettingsFormState,
} from "@/lib/actions/settings";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export type AISettingsValues = {
  tone: "AMIGAVEL" | "PROFISSIONAL" | "DIRETO" | "DESCONTRAIDO";
  rules: string | null;
  businessHours: string | null;
  autoReplyEnabled: boolean;
};

const TONES = [
  { value: "AMIGAVEL", label: "Amigável — caloroso e acolhedor" },
  { value: "PROFISSIONAL", label: "Profissional — cordial e objetivo" },
  { value: "DIRETO", label: "Direto — curto, sem rodeios" },
  { value: "DESCONTRAIDO", label: "Descontraído — leve e informal" },
];

const initialState: SettingsFormState = {};

export function AISettingsForm({
  settings,
  aiConfigured,
}: {
  settings: AISettingsValues;
  aiConfigured: boolean;
}) {
  const [state, formAction] = useActionState(
    updateAISettingsAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tone" className="text-sm font-medium text-ink">
          Tom de comunicação
        </label>
        <select
          id="tone"
          name="tone"
          defaultValue={settings.tone}
          className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-violet focus:outline-none"
        >
          {TONES.map((tone) => (
            <option key={tone.value} value={tone.value}>
              {tone.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-soft">
          Define como a IA fala com seus clientes.
        </p>
      </div>

      <Field
        label="Horário de atendimento"
        name="businessHours"
        defaultValue={settings.businessHours ?? ""}
        placeholder="Seg a sex, 9h às 18h"
        hint="A IA informa esse horário quando o cliente perguntar."
        error={state.fieldErrors?.businessHours}
      />

      <Field
        as="textarea"
        label="Regras de atendimento"
        name="rules"
        defaultValue={settings.rules ?? ""}
        placeholder={
          "Ex: nunca oferecer desconto sem aprovação; sempre confirmar o endereço antes de fechar o pedido."
        }
        hint="Instruções que a IA deve seguir sempre."
        error={state.fieldErrors?.rules}
      />

      <label className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4 text-sm text-ink">
        <input
          type="checkbox"
          name="autoReplyEnabled"
          defaultChecked={settings.autoReplyEnabled}
          disabled={!aiConfigured}
          className="mt-0.5 h-4 w-4 rounded border-line disabled:opacity-50"
        />
        <span>
          <span className="font-medium">Responder automaticamente</span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            {aiConfigured
              ? "A IA responde novas mensagens sem você precisar acionar."
              : "Disponível depois que um provedor de IA for configurado no servidor."}
          </span>
        </span>
      </label>

      {state.error && !state.fieldErrors && (
        <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral-dark">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Configurações salvas com sucesso.
        </p>
      )}

      <div>
        <SubmitButton pendingLabel="Salvando...">
          Salvar configurações
        </SubmitButton>
      </div>
    </form>
  );
}
