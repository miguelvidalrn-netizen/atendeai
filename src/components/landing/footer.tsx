import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">
            A
          </span>
          <span className="font-display text-base text-ink">AtendeAI</span>
        </div>
        <p className="text-sm text-ink-soft">
          © {new Date().getFullYear()} AtendeAI. Feito para pequenos negócios.
        </p>
        <div className="flex gap-6 text-sm text-ink-soft">
          <Link href="/login" className="hover:text-ink">
            Entrar
          </Link>
          <Link href="/cadastro" className="hover:text-ink">
            Criar conta
          </Link>
        </div>
      </div>
    </footer>
  );
}
