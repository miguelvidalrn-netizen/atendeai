import type { Metadata } from "next";
import { requireCompany } from "@/lib/guards";
import { getAISettings, getSubscription } from "@/lib/queries/settings";
import { isAIConfigured } from "@/lib/ai/service";
import { getPlan } from "@/lib/plans";
import { AISettingsForm } from "@/components/dashboard/ai-settings-form";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Configurações — AtendeAI",
};

export default async function ConfiguracoesPage() {
  const { user, company } = await requireCompany();
  const [settings, subscription] = await Promise.all([
    getAISettings(company.id),
    getSubscription(company.id),
  ]);

  const aiConfigured = isAIConfigured();
  const plan = getPlan(subscription?.plan ?? "STARTER");

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Configurações"
        description="Ajuste como a IA atende e veja os dados da sua conta."
      />

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg text-ink">Atendimento com IA</h2>
          <Badge tone={aiConfigured ? "success" : "info"}>
            {aiConfigured ? "Provedor conectado" : "Modo simulado"}
          </Badge>
        </div>

        {!aiConfigured && (
          <p className="rounded-xl border border-line bg-violet-soft/50 px-4 py-3 text-sm text-ink-soft">
            Nenhum provedor de IA está configurado. As respostas geradas hoje
            são simuladas e vêm marcadas como tal. Para ativar respostas reais,
            defina a variável de ambiente <code>AI_API_KEY</code> no servidor.
          </p>
        )}

        <Card>
          <AISettingsForm
            settings={{
              tone: settings?.tone ?? "AMIGAVEL",
              rules: settings?.rules ?? null,
              businessHours: settings?.businessHours ?? null,
              autoReplyEnabled: settings?.autoReplyEnabled ?? false,
            }}
            aiConfigured={aiConfigured}
          />
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-ink">Plano</h2>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl text-ink">
                  {plan.name}
                </span>
                <Badge tone="info">Plano atual</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{plan.tagline}</p>
            </div>
            <span className="font-display text-2xl text-ink">
              {plan.price}
              <span className="text-sm text-ink-soft">/mês</span>
            </span>
          </div>

          <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-sm text-ink-soft">
            {plan.features.map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>

          <p className="mt-5 text-xs text-ink-soft">
            A troca de plano ainda não está disponível — a cobrança será
            habilitada em uma próxima etapa.
          </p>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-ink">Conta</h2>
        <Card>
          <dl className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Responsável</dt>
              <dd className="text-ink">{user.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">E-mail</dt>
              <dd className="text-ink">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Empresa</dt>
              <dd className="text-ink">{company.name}</dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}
