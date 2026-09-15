"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type RegisterState } from "@/lib/actions/auth";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        label="Nome completo"
        name="name"
        autoComplete="name"
        placeholder="Como podemos te chamar"
        error={state.fieldErrors?.name}
        required
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@empresa.com"
        error={state.fieldErrors?.email}
        required
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
        hint="Use pelo menos 8 caracteres."
        error={state.fieldErrors?.password}
        required
      />

      {state.error && !state.fieldErrors && (
        <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral-dark">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Criando conta...">
        Criar minha conta
      </SubmitButton>

      <p className="text-center text-sm text-ink-soft">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-ink hover:text-coral">
          Entrar
        </Link>
      </p>
    </form>
  );
}
