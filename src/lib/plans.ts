/**
 * Catálogo de planos.
 *
 * Nesta fase existe apenas a estrutura: o plano fica gravado em
 * `subscriptions.plan` e os limites abaixo servem de referência para a UI.
 * Não há cobrança nem gateway de pagamento integrado.
 */

export type PlanId = "STARTER" | "PRO" | "BUSINESS";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
  limits: {
    conversationsPerMonth: number | null;
    products: number | null;
    knowledgeItems: number | null;
  };
};

export const PLANS: Plan[] = [
  {
    id: "STARTER",
    name: "Starter",
    price: "R$ 0",
    tagline: "Para começar a organizar o atendimento.",
    features: [
      "Central de conversas",
      "Até 100 conversas por mês",
      "Até 20 produtos ou serviços",
      "Base de conhecimento básica",
    ],
    limits: {
      conversationsPerMonth: 100,
      products: 20,
      knowledgeItems: 20,
    },
  },
  {
    id: "PRO",
    name: "Pro",
    price: "R$ 97",
    tagline: "Para quem vende todo dia pelo WhatsApp.",
    highlighted: true,
    features: [
      "Tudo do Starter",
      "Conversas ilimitadas",
      "Respostas automáticas com IA",
      "Gestão de leads",
      "Catálogo ilimitado",
    ],
    limits: {
      conversationsPerMonth: null,
      products: null,
      knowledgeItems: null,
    },
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: "R$ 247",
    tagline: "Para equipes que atendem em vários canais.",
    features: [
      "Tudo do Pro",
      "Vários atendentes",
      "Integrações de canais",
      "Relatórios de atendimento",
      "Suporte prioritário",
    ],
    limits: {
      conversationsPerMonth: null,
      products: null,
      knowledgeItems: null,
    },
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}
