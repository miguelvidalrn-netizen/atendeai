"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./nav-links";
import { logoutAction } from "@/lib/actions/logout";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-ink text-paper"
                : "text-ink-soft hover:bg-violet-soft/60 hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  companyName,
  userName,
  children,
}: {
  companyName: string;
  userName: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar desktop */}
      <aside className="hidden border-r border-line bg-paper-raised px-5 py-6 lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
            A
          </span>
          <span className="font-display text-lg text-ink">AtendeAI</span>
        </Link>

        <div className="mt-8 flex-1">
          <NavList />
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-ink-soft hover:bg-coral/10 hover:text-coral-dark"
          >
            Sair
          </button>
        </form>
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-paper-raised px-5 py-6 shadow-xl">
            <div className="flex items-center justify-between px-2">
              <span className="font-display text-lg text-ink">AtendeAI</span>
              <button
                aria-label="Fechar menu"
                onClick={() => setMobileOpen(false)}
                className="text-2xl leading-none text-ink-soft"
              >
                ×
              </button>
            </div>
            <div className="mt-8 flex-1">
              <NavList onNavigate={() => setMobileOpen(false)} />
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-ink-soft hover:bg-coral/10 hover:text-coral-dark"
              >
                Sair
              </button>
            </form>
          </aside>
        </div>
      )}

      <div className="flex min-h-full flex-col">
        <header className="flex items-center justify-between border-b border-line bg-paper-raised px-5 py-4 lg:px-8">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>

          <div className="hidden lg:block">
            <p className="text-sm text-ink-soft">Empresa</p>
            <p className="font-display text-lg text-ink">{companyName}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-soft sm:block">
              Olá, {userName.split(" ")[0]}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-soft text-sm font-semibold text-ink">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="flex-1 bg-paper px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
