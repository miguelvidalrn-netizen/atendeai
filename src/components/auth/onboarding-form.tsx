"use client";

import { useActionState } from "react";
import {
  completeOnboardingAction,
  type CompanyFormState,
} from "@/lib/actions/company";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: CompanyFormState = {};

const SEGMENTS = [
  "Loja / comércio",
  "Salão, estética ou clínica",
  "Restaurante ou delivery",
  "Serviços profissionais",
  "Outro",
];

export function OnboardingForm() {
  const [state, formAction] = useActionState(
    completeOnboardingAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        label="Nome da empresa"
        name="name"
        placeholder="Ex: Loja da Carol"
        error={state.fieldErrors?.name}
        required
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="segment" className="text-sm font-medium text-ink">
          Segmento
        </label>
        <select
          id="segment"
          name="segment"
          defaultValue=""
          required
          className="w-full rounded-xl border border-line bg-paper-raised px-4 py-2.5 text-sm text-ink focus:border-violet focus:outline-none"
        >
          <option value="" disabled>
            Selecione o segmento do seu negócio
          </option>
          {SEGMENTS.map((segment) => (
            <option key={segment} value={segment}>
              {segment}
            </option>
          ))}
        </select>
        {state.fieldErrors?.segment && (
          <p className="text-xs font-medium text-coral-dark">
            {state.fieldErrors.segment}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Telefone"
          name="phone"
          type="tel"
          placeholder="(84) 90000-0000"
          error={state.fieldErrors?.phone}
        />
        <Field
          label="WhatsApp"
          name="whatsapp"
          type="tel"
          placeholder="(84) 90000-0000"
          error={state.fieldErrors?.whatsapp}
        />
      </div>

      <Field
        as="textarea"
        label="Sobre a empresa"
        name="description"
        placeholder="Conte em poucas linhas o que sua empresa vende ou oferece."
        error={state.fieldErrors?.description}
      />

      {state.error && !state.fieldErrors && (
        <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral-dark">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Salvando...">
        Concluir e ir para o painel
      </SubmitButton>
    </form>
  );
}
