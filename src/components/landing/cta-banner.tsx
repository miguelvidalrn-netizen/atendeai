import Link from "next/link";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="flex flex-col items-start gap-6 rounded-[32px] bg-ink px-8 py-14 sm:px-14 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-3xl text-paper sm:text-4xl">
            Comece a atender melhor hoje.
          </h2>
          <p className="mt-3 max-w-md text-paper/70">
            Leva poucos minutos para colocar sua empresa e seus produtos no
            AtendeAI.
          </p>
        </div>
        <Link
          href="/cadastro"
          className="shrink-0 rounded-full bg-coral px-8 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] hover:bg-coral-dark"
        >
          Criar minha conta grátis
        </Link>
      </div>
    </section>
  );
}
