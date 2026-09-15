const PROBLEMS = [
  {
    title: "Mensagem sem resposta vira venda perdida",
    description:
      "O cliente pergunta o preço às 21h e, quando você responde no dia seguinte, ele já comprou em outro lugar.",
  },
  {
    title: "A mesma dúvida, o dia inteiro",
    description:
      "Horário, formas de pagamento, entrega. São as mesmas perguntas toda semana, sempre tirando seu tempo.",
  },
  {
    title: "Conversas espalhadas",
    description:
      "WhatsApp, Instagram, telefone. Sem um lugar único, é fácil esquecer quem estava quase fechando.",
  },
];

export function Problem() {
  return (
    <section className="border-y border-line bg-ink py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-coral">O problema</p>
          <h2 className="mt-3 font-display text-3xl text-paper sm:text-4xl">
            Você não perde vendas por falta de cliente. Perde por falta de
            tempo.
          </h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <div key={problem.title} className="border-t border-paper/20 pt-6">
              <h3 className="font-display text-lg text-paper">
                {problem.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/70">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
