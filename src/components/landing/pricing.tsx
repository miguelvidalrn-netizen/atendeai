import Link from "next/link";
import { PLANS } from "@/lib/plans";

export function Pricing() {
  return (
    <section id="planos" className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-xl">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">
          Planos que cabem no seu negócio
        </h2>
        <p className="mt-4 text-ink-soft">
          Comece de graça e mude de plano quando o atendimento crescer.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col rounded-3xl border p-7 ${
              plan.highlighted
                ? "border-ink bg-paper-raised shadow-[0_24px_50px_-30px_rgba(20,19,43,0.5)]"
                : "border-line bg-paper-raised"
            }`}
          >
            {plan.highlighted && (
              <span className="mb-4 inline-flex w-fit rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white">
                Mais escolhido
              </span>
            )}

            <h3 className="font-display text-xl text-ink">{plan.name}</h3>
            <p className="mt-1 text-sm text-ink-soft">{plan.tagline}</p>

            <p className="mt-6 font-display text-4xl text-ink">
              {plan.price}
              <span className="text-base text-ink-soft">/mês</span>
            </p>

            <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-line pt-6 text-sm text-ink-soft">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden className="text-coral">
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/cadastro"
              className={`mt-7 rounded-full px-6 py-3 text-center text-sm font-semibold transition-colors ${
                plan.highlighted
                  ? "bg-coral text-white hover:bg-coral-dark"
                  : "border border-line text-ink hover:border-ink"
              }`}
            >
              Começar agora
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-ink-soft">
        Durante esta fase inicial, todas as contas começam no plano Starter.
      </p>
    </section>
  );
}
