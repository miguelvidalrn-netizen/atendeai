const AUDIENCE = [
  "Lojas e vendas por WhatsApp",
  "Salões, clínicas e estúdios",
  "Restaurantes e delivery",
  "Prestadores de serviço autônomos",
];

export function Audience() {
  return (
    <section id="para-quem" className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">
          Feito para quem atende direto o cliente final.
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {AUDIENCE.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-line bg-paper-raised px-5 py-4 text-[15px] text-ink"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
