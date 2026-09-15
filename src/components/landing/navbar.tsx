import Link from "next/link";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
            A
          </span>
          <span className="font-display text-lg text-ink">AtendeAI</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-ink-soft md:flex">
          <a href="#como-funciona" className="hover:text-ink">
            Como funciona
          </a>
          <a href="#recursos" className="hover:text-ink">
            Recursos
          </a>
          <a href="#planos" className="hover:text-ink">
            Planos
          </a>
          <a href="#faq" className="hover:text-ink">
            Dúvidas
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-ink-soft hover:text-ink sm:block"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-coral"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}
