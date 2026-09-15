import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Criar conta — AtendeAI",
};

export default function CadastroPage() {
  return (
    <AuthShell
      title="Crie sua conta"
      subtitle="Leva menos de um minuto. Depois é só configurar sua empresa."
    >
      <RegisterForm />
    </AuthShell>
  );
}
