import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar — AtendeAI",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Entre para acessar a central de atendimento da sua empresa."
    >
      <LoginForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
