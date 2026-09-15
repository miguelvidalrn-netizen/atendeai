"use client";

import { useActionState } from "react";
import {
  updateCompanyAction,
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

export type CompanyValues = {
  name: string;
  segment: string;
  phone: string | null;
  whatsapp: string | null;
  description: string | null;
  address: string | null;
  website: string | null;
};

export function CompanyForm({ company }: { company: CompanyValues }) {
  const [state, formAction] = useActionState(updateCompanyAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        label="Nome da empresa"
        name="name"
        defaultValue={company.name}
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
          defaultValue={company.segment}
          className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-violet focus:outline-none"
        >
          {[...new Set([company.segment, ...SEGMENTS])].map((segment) => (
            <option key={segment} value={segment}>
              {segment}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Telefone"
          name="phone"
          type="tel"
          defaultValue={company.phone ?? ""}
          error={state.fieldErrors?.phone}
        />
        <Field
          label="WhatsApp"
          name="whatsapp"
          type="tel"
          defaultValue={company.whatsapp ?? ""}
          error={state.fieldErrors?.whatsapp}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Endereço"
          name="address"
          defaultValue={company.address ?? ""}
          error={state.fieldErrors?.address}
        />
        <Field
          label="Site"
          name="website"
          defaultValue={company.website ?? ""}
          placeholder="https://"
          error={state.fieldErrors?.website}
        />
      </div>

      <Field
        as="textarea"
        label="Sobre a empresa"
        name="description"
        defaultValue={company.description ?? ""}
        hint="Esse texto é usado como contexto pela IA no atendimento."
        error={state.fieldErrors?.description}
      />

      {state.error && !state.fieldErrors && (
        <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral-dark">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Informações atualizadas com sucesso.
        </p>
      )}

      <div>
        <SubmitButton pendingLabel="Salvando...">Salvar alterações</SubmitButton>
      </div>
    </form>
  );
}
