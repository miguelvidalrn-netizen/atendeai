"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { InboxItem } from "@/lib/queries/inbox";
import { Badge } from "@/components/ui/primitives";

const STATUS_TONE = {
  ABERTA: "warning",
  ATENDIDA: "info",
  FECHADA: "neutral",
} as const;

const STATUS_LABEL = {
  ABERTA: "Aberta",
  ATENDIDA: "Atendida",
  FECHADA: "Fechada",
} as const;

const CHANNEL_LABEL = {
  WEBCHAT: "Webchat",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  OUTRO: "Outro",
} as const;

const SENDER_PREFIX = {
  CLIENTE: "",
  EMPRESA: "Você: ",
  IA: "IA: ",
} as const;

const FILTERS = ["TODAS", "ABERTA", "ATENDIDA", "FECHADA"] as const;
type Filter = (typeof FILTERS)[number];

function formatTime(date: Date) {
  const value = new Date(date);
  const today = new Date();
  const isToday = value.toDateString() === today.toDateString();

  return isToday
    ? value.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : value.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function InboxList({
  items,
  activeId,
}: {
  items: InboxItem[];
  activeId?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("TODAS");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus = filter === "TODAS" || item.status === filter;
      if (!matchesStatus) return false;
      if (!term) return true;

      return (
        item.customerName.toLowerCase().includes(term) ||
        (item.customerContact ?? "").toLowerCase().includes(term) ||
        (item.lastMessage ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, query, filter]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por cliente ou mensagem"
          aria-label="Buscar conversas"
          className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-violet focus:outline-none"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === option
                  ? "bg-ink text-paper"
                  : "bg-paper text-ink-soft hover:text-ink"
              }`}
            >
              {option === "TODAS" ? "Todas" : STATUS_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-soft">
            Nenhuma conversa encontrada com esses filtros.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/dashboard/conversas/${item.id}`}
                  className={`flex flex-col gap-1.5 px-4 py-4 transition-colors hover:bg-violet-soft/40 ${
                    activeId === item.id ? "bg-violet-soft/60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-ink">
                      {item.customerName}
                    </span>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {formatTime(item.updatedAt)}
                    </span>
                  </div>

                  {item.lastMessage && (
                    <p className="truncate text-sm text-ink-soft">
                      {SENDER_PREFIX[item.lastMessageSender ?? "CLIENTE"]}
                      {item.lastMessage}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </Badge>
                    <span className="text-xs text-ink-soft">
                      {CHANNEL_LABEL[item.channel]}
                    </span>
                    {item.handoffRequested && (
                      <Badge tone="warning">Aguardando humano</Badge>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
