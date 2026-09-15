/**
 * Autorização centralizada.
 *
 * O objetivo é não espalhar `if (user.role === "OWNER")` pelo código. Todo
 * ponto de decisão consulta `can()` ou o guard `requirePermission()`.
 * Este arquivo é isomórfico (sem `server-only`) para que a UI possa esconder
 * botões — mas esconder botão NÃO é autorização: a checagem obrigatória
 * acontece no servidor, dentro das actions.
 */

export type Role = "OWNER" | "ADMIN" | "AGENT";

export type Permission =
  // Conversas e atendimento — todo mundo que atende precisa
  | "conversation:read"
  | "conversation:write"
  | "lead:read"
  | "lead:write"
  // Configuração do negócio
  | "product:write"
  | "knowledge:write"
  | "company:write"
  | "ai_settings:write"
  // Administração
  | "member:manage"
  | "automation:manage"
  | "billing:manage"
  | "audit:read";

const AGENT_PERMISSIONS: Permission[] = [
  "conversation:read",
  "conversation:write",
  "lead:read",
  "lead:write",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...AGENT_PERMISSIONS,
  "product:write",
  "knowledge:write",
  "company:write",
  "ai_settings:write",
  "automation:manage",
  "audit:read",
];

const OWNER_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  "member:manage",
  "billing:manage",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  AGENT: AGENT_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  OWNER: OWNER_PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  AGENT: "Atendente",
};
