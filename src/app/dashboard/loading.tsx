/**
 * Skeleton compartilhado por toda a árvore /dashboard/*.
 *
 * O App Router usa este arquivo como fallback de Suspense para qualquer
 * rota aninhada que não tenha seu próprio loading.tsx mais específico —
 * então uma navegação para /dashboard/leads, /dashboard/produtos etc.
 * já ganha feedback visual sem precisar de um arquivo por página.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>

      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-line" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-line" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-line bg-paper-raised"
          />
        ))}
      </div>

      <div className="h-64 animate-pulse rounded-2xl border border-line bg-paper-raised" />
    </div>
  );
}
