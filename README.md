# AtendeAI

SaaS de atendimento com IA para pequenos negócios. Centraliza as conversas com
clientes, organiza oportunidades de venda e usa as informações da empresa
(catálogo e base de conhecimento) como contexto para respostas automáticas.

## Stack

| Camada       | Tecnologia                                 |
| ------------ | ------------------------------------------ |
| Framework    | Next.js 16 (App Router) + React 19         |
| Linguagem    | TypeScript (modo estrito)                  |
| Estilo       | Tailwind CSS v4                            |
| Banco        | PostgreSQL via Drizzle ORM (`postgres-js`) |
| Autenticação | NextAuth v5 (credenciais + bcrypt, JWT)    |
| IA           | Camada de adapter com provedor mock e real |
| Deploy       | Vercel                                     |

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env com sua string de conexão e um AUTH_SECRET
# gere o segredo com: openssl rand -base64 32

# 3. Criar as tabelas no banco
npm run db:migrate

# 4. Subir o servidor de desenvolvimento
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

## Variáveis de ambiente

| Variável       | Obrigatória | Descrição                                             |
| -------------- | ----------- | ----------------------------------------------------- |
| `DATABASE_URL` | Sim         | String de conexão PostgreSQL                          |
| `AUTH_SECRET`  | Sim         | Chave usada pelo NextAuth para assinar sessões        |
| `NEXTAUTH_URL` | Sim         | URL pública da aplicação                              |
| `AI_API_KEY`   | Não         | Chave do provedor de IA. Sem ela, usa o provedor mock |
| `AI_MODEL`     | Não         | Modelo a usar (padrão: `claude-sonnet-4-6`)           |

Nenhuma variável usa o prefixo `NEXT_PUBLIC_`: os segredos ficam apenas no
servidor e nunca são enviados ao navegador.

## Scripts

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run typecheck    # checagem de tipos sem emitir arquivos
npm run lint         # ESLint
npm run db:generate  # gera migration a partir do schema
npm run db:migrate   # aplica as migrations pendentes
npm run db:studio    # interface visual do banco
```

## Estrutura

```
src/
├── app/
│   ├── page.tsx              # landing page
│   ├── login/ cadastro/      # autenticação
│   ├── onboarding/           # cadastro da empresa (1º acesso)
│   ├── dashboard/            # área autenticada
│   │   ├── conversas/[id]/   # central de conversas
│   │   ├── leads/            # oportunidades de venda
│   │   ├── produtos/         # catálogo
│   │   ├── conhecimento/     # FAQ e políticas
│   │   ├── empresa/          # dados da empresa
│   │   └── configuracoes/    # tom da IA, plano e conta
│   └── api/auth/             # handlers do NextAuth
├── components/
│   └── landing/ auth/ dashboard/ ui/
├── db/
│   ├── schema.ts             # tabelas e relações
│   └── index.ts              # cliente Drizzle
├── lib/
│   ├── actions/              # Server Actions (escrita)
│   ├── queries/              # leitura (server-only)
│   ├── ai/                   # camada de IA isolada
│   ├── guards.ts             # requireUser / requireCompany
│   ├── plans.ts              # catálogo de planos
│   └── validations.ts        # schemas Zod
└── proxy.ts                  # proteção de rotas
```

A separação é intencional: **UI** em `components/`, **escrita** em
`lib/actions/`, **leitura** em `lib/queries/` e **integrações** em `lib/ai/`.
Trocar o provedor de IA ou o banco não exige mexer em nenhuma página.

## Camada de IA

`src/lib/ai/` expõe a interface `AIProvider`. Existem duas implementações:

- **`MockAIProvider`** — usado quando `AI_API_KEY` não está definida. Gera
  respostas a partir do catálogo e da base de conhecimento reais da empresa,
  sem chamar nenhum modelo. Toda resposta vem com `isReal: false` e a interface
  a identifica como simulada.
- **`AnthropicAIProvider`** — adapter para um provedor real.

O contexto enviado ao modelo é montado em `service.ts` e inclui dados da
empresa, catálogo, base de conhecimento, tom de voz, regras, horário e o
histórico da conversa. Os arquivos são marcados com `server-only`, então
importá-los em um Client Component quebra o build em vez de vazar a chave.

Para trocar de provedor, basta implementar `AIProvider` e registrá-lo em
`getAIProvider()`.

## Multi-tenant

Cada usuário tem uma empresa (`companies.owner_id`) e todo dado de negócio
carrega `company_id`. O isolamento é garantido em duas camadas:

1. `requireCompany()` resolve a empresa a partir da sessão do servidor — o
   `companyId` nunca vem do cliente.
2. Toda leitura e escrita filtra por `companyId`, inclusive updates e deletes,
   que usam `and(eq(id), eq(companyId))`.

## Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Importe o projeto na Vercel (o Next.js é detectado automaticamente).
3. Configure `DATABASE_URL`, `AUTH_SECRET` e `NEXTAUTH_URL` nas variáveis de
   ambiente do projeto. Adicione `AI_API_KEY` quando for ativar a IA real.
4. Rode `npm run db:migrate` apontando para o banco de produção.

Qualquer Postgres gerenciado funciona (Neon, Supabase, Vercel Postgres).

## Status

Implementado: landing page, autenticação, onboarding, dashboard, central de
conversas, leads, catálogo, base de conhecimento, configurações, camada de IA
com provedor mock e estrutura de planos.

Não implementado: cobrança e gateway de pagamento, integração real com
WhatsApp/Instagram, múltiplos atendentes por empresa, recuperação de senha.
