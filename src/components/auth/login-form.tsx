"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/lib/actions/login";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: LoginState = {};

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />

      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@empresa.com"
        required
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Sua senha"
        required
      />

      {state.error && (
        <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral-dark">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Entrando...">Entrar</SubmitButton>

      <p className="text-center text-sm text-ink-soft">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-ink hover:text-coral">
          Cadastre-se grátis
        </Link>
      </p>
    </form>
  );
}
