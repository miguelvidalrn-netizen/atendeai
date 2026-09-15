export function ChatMockup() {
  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute -top-5 -left-5 h-full w-full rounded-[28px] border border-line bg-violet-soft/60" />
      <div className="relative rounded-[28px] border border-line bg-paper-raised p-5 shadow-[0_30px_60px_-25px_rgba(20,19,43,0.35)]">
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">
            LC
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Loja da Carol</p>
            <p className="text-xs text-ink-soft">Conversa via WhatsApp</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-paper px-4 py-2.5 text-sm text-ink">
            Oi! Vocês têm o vestido floral no tamanho M?
          </div>

          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-ink px-4 py-2.5 text-sm text-paper">
            Temos sim! Separei aqui pra você: R$ 189,90, com entrega em até 2
            dias em Natal. Quer que eu já reserve uma peça no seu tamanho?
          </div>

          <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-violet" />
            Respondido pela IA da loja
          </div>

          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-paper px-4 py-2.5 text-sm text-ink">
            Perfeito, pode reservar!
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-success/10 px-3 py-2 text-xs font-medium text-success">
          <span>Venda registrada</span>
          <span>R$ 189,90</span>
        </div>
      </div>
    </div>
  );
}
