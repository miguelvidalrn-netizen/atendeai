import { z } from "zod";
import type { DomainEventName } from "@/lib/events/types";

/**
 * Contratos de automação: Trigger → Condition → Action.
 *
 * Não existe builder visual nem DSL complexa. São três estruturas tipadas,
 * validadas por Zod na entrada e na leitura do banco (o conteúdo vem de
 * colunas jsonb, então não pode ser confiado só pelo tipo TypeScript).
 */

export const conditionOperatorSchema = z.enum([
  "eq",
  "neq",
  "contains",
  "gt",
  "lt",
  "exists",
]);

export type ConditionOperator = z.infer<typeof conditionOperatorSchema>;

/** Caminho é lido do payload do evento, ex: "status" ou "lead.status". */
export const automationConditionSchema = z.object({
  path: z.string().min(1).max(100),
  operator: conditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export type AutomationCondition = z.infer<typeof automationConditionSchema>;

/**
 * Ações disponíveis. Cada variante é discriminada por `type`, então
 * adicionar uma nova ação é adicionar uma variante + um handler no executor.
 */
export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("lead.update_status"),
    status: z.enum(["NOVO", "EM_CONTATO", "QUALIFICADO", "GANHO", "PERDIDO"]),
  }),
  z.object({
    type: z.literal("conversation.request_handoff"),
    reason: z.string().max(300).optional(),
  }),
  z.object({
    type: z.literal("audit.note"),
    note: z.string().min(1).max(500),
  }),
]);

export type AutomationAction = z.infer<typeof automationActionSchema>;

export const automationDefinitionSchema = z.object({
  name: z.string().min(2).max(120),
  trigger: z.string().min(3).max(60),
  conditions: z.array(automationConditionSchema).max(10).default([]),
  actions: z.array(automationActionSchema).min(1).max(5),
  enabled: z.boolean().default(true),
});

export type AutomationDefinition = z.infer<typeof automationDefinitionSchema>;

export type AutomationRecord = AutomationDefinition & {
  id: string;
  companyId: string;
  trigger: DomainEventName | string;
};
