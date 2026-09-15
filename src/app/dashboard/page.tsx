import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/guards";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { listInbox } from "@/lib/queries/inbox";
import { isAIConfigured } from "@/lib/ai/service";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Painel — AtendeAI",
};

const SETUP_STEPS = [
  {
    href: "/dashboard/produtos",
    label: "Cadastrar produtos e serviços",
    hint: "A IA precisa saber o que você vende.",
  },
  {
    href: "/dashboard/conhecimento",
    label: "Montar a base de conhecimento",
    hint: "Perguntas frequentes, horários e políticas.",
  },
  {
    href: "/dashboard/conversas",
    label: "Registrar a primeira conversa",
    hint: "Veja como o atendimento funciona na prática.",
  },
];

export default async function DashboardOverviewPage() {
  const { company } = await requireCompany();
  const [stats, inbox] = await Promise.all([
    getDashboardStats(company.id),
    listInbox(company.id),
  ]);

  const isEmpty =
    stats.totalConversations === 0 &&
    stats.totalProducts === 0 &&
    stats.totalLeads === 0;

  const cards = [
    {
      label: "Conversas em aberto",
      value: stats.openConversations,
      href: "/dashboard/conversas",
    },
    {
      label: "Total de conversas",
      value: stats.totalConversations,
      href: "/dashboard/conversas",
    },
    {
      label: "Leads em aberto",
      value: stats.totalLeads - stats.wonLeads,
      href: "/dashboard/leads",
    },
    {
      label: "Itens no catálogo",
      value: stats.activeProducts,
      href: "/dashboard/produtos",
    },
  ];

  const recent = inbox.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={company.name}
        description="Um resumo do seu atendimento."
      />

      {isEmpty ? (
        <EmptyState
          title="Seu painel está pronto para começar"
          description="Ainda não há dados para mostrar. Complete os passos abaixo e as métricas aparecem aqui automaticamente."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-line bg-paper-raised p-5 transition-colors hover:border-violet"
            >
              <p className="text-sm text-ink-soft">{card.label}</p>
              <p className="mt-2 font-display text-3xl text-ink">
                {card.value}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg text-ink">Comece por aqui</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {SETUP_STEPS.map((step) => (
              <li key={step.href}>
                <Link
                  href={step.href}
                  className="group flex flex-col gap-0.5"
                >
                  <span className="text-sm font-medium text-ink group-hover:text-coral">
                    {step.label} →
                  </span>
                  <span className="text-xs text-ink-soft">{step.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg text-ink">Conversas recentes</h2>
            {recent.length > 0 && (
              <Link
                href="/dashboard/conversas"
                className="text-sm font-medium text-ink-soft hover:text-ink"
              >
                Ver todas
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">
              Nenhuma conversa registrada ainda.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/dashboard/conversas/${item.id}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {item.customerName}
                      </span>
                      {item.lastMessage && (
                        <span className="block truncate text-xs text-ink-soft">
                          {item.lastMessage}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {new Date(item.updatedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="bg-violet-soft/50">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-lg text-ink">IA de atendimento</h2>
          <Badge tone={isAIConfigured() ? "success" : "info"}>
            {isAIConfigured() ? "Provedor conectado" : "Modo simulado"}
          </Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          {isAIConfigured()
            ? "A IA já pode gerar respostas usando seu catálogo e sua base de conhecimento. Ajuste o tom e as regras em Configurações."
            : "A IA já funciona em modo simulado para você testar o fluxo. As respostas vêm marcadas como simuladas até um provedor real ser configurado."}
        </p>
        <Link
          href="/dashboard/configuracoes"
          className="mt-4 inline-block text-sm font-semibold text-ink hover:text-coral"
        >
          Abrir configurações →
        </Link>
      </Card>
    </div>
  );
}
