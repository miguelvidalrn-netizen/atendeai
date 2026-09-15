const FAQS = [
  {
    question: "Preciso saber alguma coisa de tecnologia para usar?",
    answer:
      "Não. Você cria a conta, responde algumas perguntas sobre a empresa e cadastra o que vende. O resto é conversa normal, como você já faz hoje.",
  },
  {
    question: "A IA responde sozinha pelo meu WhatsApp?",
    answer:
      "Ainda não. Hoje você acompanha as conversas pela central do AtendeAI e pode gerar respostas com a IA antes de enviar. A conexão automática com WhatsApp e Instagram está no nosso roteiro.",
  },
  {
    question: "De onde a IA tira as respostas?",
    answer:
      "Das informações que você cadastra: dados da empresa, produtos com preço e descrição, e a base de conhecimento com perguntas frequentes, horários e políticas. Ela não inventa o que você não informou.",
  },
  {
    question: "Meus dados ficam separados dos de outras empresas?",
    answer:
      "Sim. Cada conta tem sua própria empresa, e todas as consultas ao banco são filtradas por ela. Nenhuma empresa enxerga conversas, produtos ou clientes de outra.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim. O plano Starter é gratuito e você não precisa cadastrar cartão para começar.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-line bg-paper-raised/60 py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">
          Perguntas frequentes
        </h2>

        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-ink">
                {faq.question}
                <span
                  aria-hidden
                  className="shrink-0 text-xl text-ink-soft transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
