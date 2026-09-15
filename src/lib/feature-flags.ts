import type { PlanId } from "@/lib/plans";

/**
 * Feature flags.
 *
 * Camada intencionalmente mínima: resolução é uma função pura de
 * (flag, plano, ambiente). Sem painel, sem serviço externo, sem cache.
 *
 * Precedência:
 * 1. Override por ambiente (`FEATURE_<NOME>=on|off`) — permite ligar algo em
 *    staging sem migração nem deploy de código;
 * 2. Disponibilidade por plano;
 * 3. Padrão da flag.
 */

export type FeatureFlag =
  | "ai_tools"
  | "automations"
  | "multi_agent"
  | "audit_log"
  | "whatsapp"
  | "instagram";

type FlagDefinition = {
  /** Planos que têm acesso. `null` = todos os planos. */
  plans: PlanId[] | null;
  /** Valor quando nada mais decide. */
  defaultValue: boolean;
  description: string;
};

const FLAGS: Record<FeatureFlag, FlagDefinition> = {
  ai_tools: {
    plans: null,
    defaultValue: true,
    description: "Permite que o agente de IA use ferramentas server-side.",
  },
  automations: {
    plans: ["PRO", "BUSINESS"],
    defaultValue: true,
    description: "Motor de automações trigger/condition/action.",
  },
  multi_agent: {
    plans: ["BUSINESS"],
    defaultValue: false,
    description: "Seleção entre múltiplos agentes especializados.",
  },
  audit_log: {
    plans: ["PRO", "BUSINESS"],
    defaultValue: true,
    description: "Consulta ao rastro de auditoria pela interface.",
  },
  whatsapp: {
    plans: ["PRO", "BUSINESS"],
    defaultValue: false,
    description: "Canal WhatsApp. Requer provider implementado.",
  },
  instagram: {
    plans: ["BUSINESS"],
    defaultValue: false,
    description: "Canal Instagram. Requer provider implementado.",
  },
};

function envOverride(flag: FeatureFlag): boolean | null {
  const raw = process.env[`FEATURE_${flag.toUpperCase()}`];
  if (raw === undefined) return null;
  return raw === "on" || raw === "true" || raw === "1";
}

export function isFeatureEnabled(
  flag: FeatureFlag,
  context: { plan?: PlanId } = {}
): boolean {
  const override = envOverride(flag);
  if (override !== null) return override;

  const definition = FLAGS[flag];

  if (definition.plans && context.plan && !definition.plans.includes(context.plan)) {
    return false;
  }

  return definition.defaultValue;
}

export function describeFlag(flag: FeatureFlag): FlagDefinition {
  return FLAGS[flag];
}

export const ALL_FLAGS = Object.keys(FLAGS) as FeatureFlag[];
