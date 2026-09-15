import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ----------------------------------------------------------------------------
// Enums
// ----------------------------------------------------------------------------
export const productTypeEnum = pgEnum("product_type", ["PRODUTO", "SERVICO"]);

export const conversationChannelEnum = pgEnum("conversation_channel", [
  "WEBCHAT",
  "WHATSAPP",
  "INSTAGRAM",
  "OUTRO",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "ABERTA",
  "ATENDIDA",
  "FECHADA",
]);

export const messageSenderEnum = pgEnum("message_sender", [
  "CLIENTE",
  "EMPRESA",
  "IA",
]);

// ----------------------------------------------------------------------------
// Usuários (donos de conta)
// ----------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
);

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.id],
    references: [companies.ownerId],
  }),
}));

// ----------------------------------------------------------------------------
// Empresas (uma por usuário nesta fase do produto)
// ----------------------------------------------------------------------------
export const companies = pgTable(
  "companies",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    segment: text("segment").notNull(),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    description: text("description"),
    address: text("address"),
    website: text("website"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("companies_owner_id_idx").on(table.ownerId)]
);

export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  products: many(products),
  conversations: many(conversations),
}));

// ----------------------------------------------------------------------------
// Produtos / Serviços
// ----------------------------------------------------------------------------
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }),
    type: productTypeEnum("type").notNull().default("PRODUTO"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("products_company_id_idx").on(table.companyId)]
);

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
}));

// ----------------------------------------------------------------------------
// Conversas com clientes
// ----------------------------------------------------------------------------
export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    customerName: text("customer_name").notNull(),
    customerContact: text("customer_contact"),
    channel: conversationChannelEnum("channel").notNull().default("WEBCHAT"),
    status: conversationStatusEnum("status").notNull().default("ABERTA"),
    /** Marcado pela tool handoffToHuman quando a IA decide escalar. */
    handoffRequested: boolean("handoff_requested").notNull().default(false),
    handoffReason: text("handoff_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("conversations_company_id_idx").on(table.companyId)]
);

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [conversations.companyId],
      references: [companies.id],
    }),
    messages: many(messages),
  })
);

// ----------------------------------------------------------------------------
// Mensagens de uma conversa
// ----------------------------------------------------------------------------
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    sender: messageSenderEnum("sender").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("messages_conversation_id_idx").on(table.conversationId)]
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// ----------------------------------------------------------------------------
// Leads — oportunidades de venda geradas a partir das conversas
// ----------------------------------------------------------------------------
export const leadStatusEnum = pgEnum("lead_status", [
  "NOVO",
  "EM_CONTATO",
  "QUALIFICADO",
  "GANHO",
  "PERDIDO",
]);

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    // Lead pode nascer de uma conversa ou ser criado manualmente.
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    contact: text("contact"),
    status: leadStatusEnum("status").notNull().default("NOVO"),
    estimatedValue: numeric("estimated_value", { precision: 10, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("leads_company_id_idx").on(table.companyId)]
);

export const leadsRelations = relations(leads, ({ one }) => ({
  company: one(companies, {
    fields: [leads.companyId],
    references: [companies.id],
  }),
  conversation: one(conversations, {
    fields: [leads.conversationId],
    references: [conversations.id],
  }),
}));

// ----------------------------------------------------------------------------
// Base de conhecimento — FAQ, políticas e informações que a IA usará
// ----------------------------------------------------------------------------
export const knowledgeCategoryEnum = pgEnum("knowledge_category", [
  "FAQ",
  "POLITICA",
  "HORARIO",
  "ENTREGA",
  "PAGAMENTO",
  "OUTRO",
]);

export const knowledgeItems = pgTable(
  "knowledge_items",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    category: knowledgeCategoryEnum("category").notNull().default("FAQ"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("knowledge_items_company_id_idx").on(table.companyId)]
);

export const knowledgeItemsRelations = relations(knowledgeItems, ({ one }) => ({
  company: one(companies, {
    fields: [knowledgeItems.companyId],
    references: [companies.id],
  }),
}));

// ----------------------------------------------------------------------------
// Configurações de IA da empresa (tom de voz e regras de atendimento)
// ----------------------------------------------------------------------------
export const aiToneEnum = pgEnum("ai_tone", [
  "AMIGAVEL",
  "PROFISSIONAL",
  "DIRETO",
  "DESCONTRAIDO",
]);

export const aiSettings = pgTable(
  "ai_settings",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    tone: aiToneEnum("tone").notNull().default("AMIGAVEL"),
    // Regras livres definidas pelo dono do negócio (ex: "nunca dar desconto").
    rules: text("rules"),
    businessHours: text("business_hours"),
    autoReplyEnabled: boolean("auto_reply_enabled").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("ai_settings_company_id_idx").on(table.companyId)]
);

export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  company: one(companies, {
    fields: [aiSettings.companyId],
    references: [companies.id],
  }),
}));

// ----------------------------------------------------------------------------
// Assinatura / plano da empresa (estrutura, sem gateway de pagamento)
// ----------------------------------------------------------------------------
export const planEnum = pgEnum("plan", ["STARTER", "PRO", "BUSINESS"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ATIVA",
  "CANCELADA",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull().default("STARTER"),
    status: subscriptionStatusEnum("status").notNull().default("ATIVA"),
    // Campos de billing: preenchidos por um gateway no futuro. Nenhum
    // checkout é implementado agora, mas o domínio já comporta o vínculo.
    provider: text("provider"),
    externalCustomerId: text("external_customer_id"),
    externalSubscriptionId: text("external_subscription_id"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("subscriptions_company_id_idx").on(table.companyId)]
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  company: one(companies, {
    fields: [subscriptions.companyId],
    references: [companies.id],
  }),
}));

// ----------------------------------------------------------------------------
// RBAC — vínculo entre usuário e empresa com papel
// ----------------------------------------------------------------------------
// O modelo atual tem um dono por empresa (companies.owner_id). Esta tabela
// prepara múltiplos usuários por empresa sem quebrar o que já existe: o dono
// continua sendo resolvido por owner_id e tratado como OWNER.
export const roleEnum = pgEnum("role", ["OWNER", "ADMIN", "AGENT"]);

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("AGENT"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("memberships_company_user_idx").on(table.companyId, table.userId),
    index("memberships_user_id_idx").on(table.userId),
  ]
);

export const membershipsRelations = relations(memberships, ({ one }) => ({
  company: one(companies, {
    fields: [memberships.companyId],
    references: [companies.id],
  }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

// ----------------------------------------------------------------------------
// Audit log — rastro de operações relevantes
// ----------------------------------------------------------------------------
// Nunca recebe senha, token, chave de API ou segredo: o writer redige o
// metadata antes de gravar.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    // Pode ser nulo quando a ação foi executada pelo sistema (IA/automação).
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_company_id_idx").on(table.companyId),
    index("audit_logs_entity_idx").on(table.entity, table.entityId),
  ]
);

// ----------------------------------------------------------------------------
// Automações — trigger / condition / action
// ----------------------------------------------------------------------------
export const automations = pgTable(
  "automations",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Nome do evento de domínio que dispara a regra (ex: "lead.created"). */
    trigger: text("trigger").notNull(),
    conditions: jsonb("conditions").$type<unknown[]>().notNull().default([]),
    actions: jsonb("actions").$type<unknown[]>().notNull().default([]),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("automations_company_trigger_idx").on(table.companyId, table.trigger),
  ]
);

// ----------------------------------------------------------------------------
// Idempotência — evita duplicar operações críticas em retry/duplo clique
// ----------------------------------------------------------------------------
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    /** Namespace da operação, ex: "lead.create" ou "ai.reply". */
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    /** Id da entidade produzida, para devolver o mesmo resultado no replay. */
    entityId: text("entity_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idempotency_company_scope_key_idx").on(
      table.companyId,
      table.scope,
      table.key
    ),
  ]
);

// ----------------------------------------------------------------------------
// Memória do cliente — fatos duráveis aprendidos ao longo das conversas
// ----------------------------------------------------------------------------
// Armazenamento SQL simples. O MemoryProvider abstrai isto para que uma
// memória semântica/RAG possa substituí-lo sem tocar no agente.
export const customerMemories = pgTable(
  "customer_memories",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    /** Chave estável do cliente (contato normalizado ou id da conversa). */
    customerKey: text("customer_key").notNull(),
    summary: text("summary"),
    attributes: jsonb("attributes").$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_memories_company_key_idx").on(
      table.companyId,
      table.customerKey
    ),
  ]
);
