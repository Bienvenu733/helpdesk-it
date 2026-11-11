"use client";

import { Hourglass } from "lucide-react";
import Link from "next/link";
import { Ticket } from "@/lib/api";
import { CategoryBadge, PriorityBadge } from "./badges";
import { EmptyState } from "./ui";

const RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

function waited(since: string) {
  const min = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60_000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} h ${min % 60} min` : `${min} min`;
}

/** Tickets en attente, dans l'ordre de la répartition automatique : urgent d'abord, puis le plus ancien. */
export function waitingQueue(tickets: Ticket[]) {
  return tickets
    .filter((t) => t.status === "OPEN" && t.assigned_to_id === null)
    .sort(
      (a, b) =>
        RANK[a.priority] - RANK[b.priority] ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
}

export function QueueList({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return <EmptyState icon={Hourglass}>Aucun ticket en attente : tous sont pris en charge.</EmptyState>;
  }
  return (
    <ol className="divide-y divide-line">
      {tickets.map((t, i) => (
        <li key={t.id} className="flex items-center gap-4 px-5 py-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-sm font-semibold text-warning-ink">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              <Link href={`/tickets/${t.id}`} className="hover:text-primary-strong hover:underline">
                #{t.id} · {t.title}
              </Link>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <CategoryBadge category={t.category} />
              <PriorityBadge priority={t.priority} />
            </p>
          </div>
          <span className="shrink-0 text-xs text-ink-2">attend depuis {waited(t.created_at)}</span>
        </li>
      ))}
    </ol>
  );
}
