import Link from "next/link";
import { ChatMockup } from "./chat-mockup";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-16 px-6 pt-16 pb-20 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-24 md:pb-28">
      <div>
        <p className="text-sm font-medium text-coral-dark">
          Atendimento com IA para pequenos negócios
        </p>
        <h1 className="mt-4 font-display text-4xl leading-[1.08] text-ink sm:text-5xl md:text-[3.4rem]">
          Toda conversa com seu cliente é uma chance de vender.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
          O AtendeAI responde dúvidas, apresenta seus produtos e conduz o
          cliente até a compra — para você não perder vendas enquanto cuida
          do resto do negócio.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/cadastro"
            className="rounded-full bg-coral px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_-12px_rgba(255,92,56,0.6)] transition-transform hover:scale-[1.02] hover:bg-coral-dark"
          >
            Criar minha conta grátis
          </Link>
          <a
            href="#como-funciona"
            className="text-sm font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-coral"
          >
            Ver como funciona
          </a>
        </div>

        <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-7">
          <div>
            <dt className="font-display text-2xl text-ink">24/7</dt>
            <dd className="mt-1 text-sm text-ink-soft">
              Atendimento sem pausa
            </dd>
          </div>
          <div>
            <dt className="font-display text-2xl text-ink">1 lugar</dt>
            <dd className="mt-1 text-sm text-ink-soft">
              Para todas as conversas
            </dd>
          </div>
          <div>
            <dt className="font-display text-2xl text-ink">Minutos</dt>
            <dd className="mt-1 text-sm text-ink-soft">
              Para configurar a empresa
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex justify-center md:justify-end">
        <ChatMockup />
      </div>
    </section>
  );
}
