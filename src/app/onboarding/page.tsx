import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { getCompanyByOwnerId } from "@/lib/queries/company";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = {
  title: "Configure sua empresa — AtendeAI",
};

export default async function OnboardingPage() {
  const user = await requireUser();
  const company = await getCompanyByOwnerId(user.id);

  if (company) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-10 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
          A
        </span>
        <span className="font-display text-lg text-ink">AtendeAI</span>
      </Link>

      <p className="text-sm font-medium text-coral-dark">Último passo</p>
      <h1 className="mt-2 font-display text-3xl text-ink">
        Fale sobre sua empresa
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Essas informações vão aparecer no seu painel e, mais adiante, ajudarão
        a IA a atender seus clientes.
      </p>

      <div className="mt-8 rounded-3xl border border-line bg-paper-raised p-6 sm:p-8">
        <OnboardingForm />
      </div>
    </div>
  );
}
