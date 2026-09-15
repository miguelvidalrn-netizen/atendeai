import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(120, "Nome muito longo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(72, "Senha muito longa."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa.")
    .max(120, "Nome muito longo."),
  segment: z
    .string()
    .trim()
    .min(2, "Selecione ou informe o segmento.")
    .max(80, "Segmento muito longo."),
  phone: z.string().trim().max(30, "Telefone muito longo.").optional().or(z.literal("")),
  whatsapp: z
    .string()
    .trim()
    .max(30, "WhatsApp muito longo.")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(2000, "Descrição muito longa.")
    .optional()
    .or(z.literal("")),
});

export const companyUpdateSchema = onboardingSchema.extend({
  address: z.string().trim().max(200).optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
});

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do produto/serviço.")
    .max(150, "Nome muito longo."),
  description: z
    .string()
    .trim()
    .max(2000, "Descrição muito longa.")
    .optional()
    .or(z.literal("")),
  price: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || !Number.isNaN(Number(val.replace(",", "."))),
      "Informe um preço válido."
    ),
  type: z.enum(["PRODUTO", "SERVICO"]),
  active: z.boolean().default(true),
});

export const newConversationSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Informe o nome do cliente.")
    .max(120, "Nome muito longo."),
  customerContact: z
    .string()
    .trim()
    .max(120, "Contato muito longo.")
    .optional()
    .or(z.literal("")),
  channel: z.enum(["WEBCHAT", "WHATSAPP", "INSTAGRAM", "OUTRO"]),
  firstMessage: z
    .string()
    .trim()
    .min(1, "Escreva a primeira mensagem do cliente.")
    .max(4000, "Mensagem muito longa."),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().trim().min(1, "Escreva uma mensagem.").max(4000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type NewConversationInput = z.infer<typeof newConversationSchema>;

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do lead.")
    .max(120, "Nome muito longo."),
  contact: z.string().trim().max(120, "Contato muito longo.").optional().or(z.literal("")),
  status: z.enum(["NOVO", "EM_CONTATO", "QUALIFICADO", "GANHO", "PERDIDO"]),
  estimatedValue: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || !Number.isNaN(Number(val.replace(",", "."))),
      "Informe um valor válido."
    ),
  notes: z.string().trim().max(2000, "Observação muito longa.").optional().or(z.literal("")),
});

export const knowledgeSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Informe a pergunta ou o título.")
    .max(300, "Texto muito longo."),
  answer: z
    .string()
    .trim()
    .min(2, "Informe a resposta.")
    .max(4000, "Resposta muito longa."),
  category: z.enum(["FAQ", "POLITICA", "HORARIO", "ENTREGA", "PAGAMENTO", "OUTRO"]),
  active: z.boolean().default(true),
});

export const aiSettingsSchema = z.object({
  tone: z.enum(["AMIGAVEL", "PROFISSIONAL", "DIRETO", "DESCONTRAIDO"]),
  rules: z.string().trim().max(4000, "Texto muito longo.").optional().or(z.literal("")),
  businessHours: z
    .string()
    .trim()
    .max(300, "Texto muito longo.")
    .optional()
    .or(z.literal("")),
  autoReplyEnabled: z.boolean().default(false),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type KnowledgeInput = z.infer<typeof knowledgeSchema>;
export type AISettingsInput = z.infer<typeof aiSettingsSchema>;
