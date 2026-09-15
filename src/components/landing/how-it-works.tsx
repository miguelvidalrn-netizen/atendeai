const STEPS = [
  {
    number: "1",
    title: "Crie sua conta",
    description: "Cadastro rápido com nome, e-mail e senha.",
  },
  {
    number: "2",
    title: "Configure sua empresa",
    description: "Conte o segmento, contatos e um pouco sobre o negócio.",
  },
  {
    number: "3",
    title: "Cadastre produtos e serviços",
    description: "Adicione o que você vende, com preço e descrição.",
  },
  {
    number: "4",
    title: "Atenda pela central de conversas",
    description: "Acompanhe os clientes e prepare o terreno para a IA responder.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="border-y border-line bg-paper-raised/60 py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">
          Como funciona
        </h2>

        <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.number} className="relative pl-1">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink font-display text-sm text-ink">
                  {step.number}
                </span>
                {index < STEPS.length - 1 && (
                  <span className="hidden h-px flex-1 bg-line lg:block" />
                )}
              </div>
              <h3 className="mt-4 font-display text-lg text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
