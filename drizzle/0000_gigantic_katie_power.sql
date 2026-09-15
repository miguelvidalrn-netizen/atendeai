CREATE TYPE "public"."ai_tone" AS ENUM('AMIGAVEL', 'PROFISSIONAL', 'DIRETO', 'DESCONTRAIDO');--> statement-breakpoint
CREATE TYPE "public"."conversation_channel" AS ENUM('WEBCHAT', 'WHATSAPP', 'INSTAGRAM', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('ABERTA', 'ATENDIDA', 'FECHADA');--> statement-breakpoint
CREATE TYPE "public"."knowledge_category" AS ENUM('FAQ', 'POLITICA', 'HORARIO', 'ENTREGA', 'PAGAMENTO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NOVO', 'EM_CONTATO', 'QUALIFICADO', 'GANHO', 'PERDIDO');--> statement-breakpoint
CREATE TYPE "public"."message_sender" AS ENUM('CLIENTE', 'EMPRESA', 'IA');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('STARTER', 'PRO', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('PRODUTO', 'SERVICO');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ATIVA', 'CANCELADA');--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"tone" "ai_tone" DEFAULT 'AMIGAVEL' NOT NULL,
	"rules" text,
	"business_hours" text,
	"auto_reply_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"segment" text NOT NULL,
	"phone" text,
	"whatsapp" text,
	"description" text,
	"address" text,
	"website" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_contact" text,
	"channel" "conversation_channel" DEFAULT 'WEBCHAT' NOT NULL,
	"status" "conversation_status" DEFAULT 'ABERTA' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_items" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" "knowledge_category" DEFAULT 'FAQ' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"conversation_id" text,
	"name" text NOT NULL,
	"contact" text,
	"status" "lead_status" DEFAULT 'NOVO' NOT NULL,
	"estimated_value" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"content" text NOT NULL,
	"sender" "message_sender" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2),
	"type" "product_type" DEFAULT 'PRODUTO' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"plan" "plan" DEFAULT 'STARTER' NOT NULL,
	"status" "subscription_status" DEFAULT 'ATIVA' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_settings_company_id_idx" ON "ai_settings" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_owner_id_idx" ON "companies" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "conversations_company_id_idx" ON "conversations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "knowledge_items_company_id_idx" ON "knowledge_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "leads_company_id_idx" ON "leads" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "products_company_id_idx" ON "products" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_company_id_idx" ON "subscriptions" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");