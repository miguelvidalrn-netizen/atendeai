import "server-only";
import { RateLimitError } from "@/lib/errors";

/**
 * Rate limiting — arquitetura pronta, sem serviço externo.
 *
 * A interface é o que importa: quando um Redis/Upstash existir, basta uma
 * nova classe implementando `RateLimiter` e um ajuste em `getRateLimiter()`.
 * Nenhum call site muda.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export interface RateLimiter {
  readonly name: string;
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

/** Desliga o controle. Padrão quando nada está configurado. */
export class NoopRateLimiter implements RateLimiter {
  readonly name = "noop";

  async check(): Promise<RateLimitResult> {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, retryAfterSeconds: 0 };
  }
}

/**
 * Janela fixa em memória.
 *
 * LIMITAÇÃO IMPORTANTE: o estado vive no processo. Em serverless com várias
 * instâncias, cada uma conta separadamente, então o limite efetivo é
 * `limite × instâncias`. Serve como defesa contra abuso acidental e duplo
 * clique — NÃO como proteção contra ataque distribuído. Para isso é preciso
 * um store compartilhado.
 */
export class InMemoryRateLimiter implements RateLimiter {
  readonly name = "memory";
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  async check(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      this.evictExpired(now);
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    if (bucket.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      };
    }

    bucket.count += 1;
    return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
  }

  private evictExpired(now: number) {
    if (this.buckets.size < 5000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

declare global {
  var __atendeaiRateLimiter: RateLimiter | undefined;
}

export function getRateLimiter(): RateLimiter {
  if (!globalThis.__atendeaiRateLimiter) {
    globalThis.__atendeaiRateLimiter =
      process.env.RATE_LIMIT_ENABLED === "true"
        ? new InMemoryRateLimiter()
        : new NoopRateLimiter();
  }
  return globalThis.__atendeaiRateLimiter;
}

/** Perfis nomeados, para não espalhar números mágicos pelo código. */
export const RATE_LIMITS = {
  "ai.generate": { limit: 20, windowSeconds: 60 },
  "auth.login": { limit: 10, windowSeconds: 300 },
  "auth.register": { limit: 5, windowSeconds: 3600 },
  "lead.create": { limit: 60, windowSeconds: 60 },
} as const;

export type RateLimitProfile = keyof typeof RATE_LIMITS;

/** Aplica um perfil e lança RateLimitError se estourar. */
export async function enforceRateLimit(
  profile: RateLimitProfile,
  identifier: string
): Promise<void> {
  const { limit, windowSeconds } = RATE_LIMITS[profile];
  const result = await getRateLimiter().check(
    `${profile}:${identifier}`,
    limit,
    windowSeconds
  );

  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds);
  }
}
