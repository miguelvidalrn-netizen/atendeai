const FEATURES = [
  {
    title: "Central de conversas",
    description:
      "Veja e responda os clientes de cada canal em um único lugar, sem perder o fio da conversa.",
  },
  {
    title: "Catálogo sempre à mão",
    description:
      "Cadastre produtos e serviços com preço e descrição para a IA usar nas respostas certas.",
  },
  {
    title: "Da dúvida à venda",
    description:
      "A IA entende o que o cliente precisa e conduz a conversa até o fechamento, sem parecer robótica.",
  },
  {
    title: "Sua empresa, seu jeito",
    description:
      "Informações do negócio, horários e tom de voz ficam guardados para o atendimento refletir sua marca.",
  },
];

export function Features() {
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-xl">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">
          Tudo que um pequeno negócio precisa para atender bem.
        </h2>
        <p className="mt-4 text-ink-soft">
          Sem telas complicadas nem funções que você nunca vai usar — só o
          essencial para atender e vender melhor.
        </p>
      </div>

      <div className="mt-12 grid gap-x-12 gap-y-0 border-t border-line md:grid-cols-2">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="border-b border-line py-8 md:odd:border-r md:odd:pr-12 md:even:pl-12"
          >
            <h3 className="font-display text-xl text-ink">{feature.title}</h3>
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
