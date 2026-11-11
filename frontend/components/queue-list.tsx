"use client";

import Link from "next/link";
import { CATEGORY_LABEL, PRIORITY_LABEL, Ticket } from "@/lib/api";

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
  return (
    <ol className="flex flex-col gap-2">
      {tickets.length === 0 && (
        <li className="text-sm text-zinc-500">Aucun ticket en attente.</li>
      )}
      {tickets.map((t, i) => (
        <li
          key={t.id}
          className="flex items-center justify-between gap-3 rounded border border-zinc-300 px-4 py-3 dark:border-zinc-700"
        >
          <span>
            <span className="mr-2 text-zinc-500">{i + 1}.</span>
            <Link href={`/tickets/${t.id}`} className="text-blue-600 underline">
              #{t.id}
            </Link>{" "}
            {t.title}
            <span className="block text-xs text-zinc-500">
              {CATEGORY_LABEL[t.category]} · {PRIORITY_LABEL[t.priority]}
            </span>
          </span>
          <span className="whitespace-nowrap text-xs text-zinc-500">
            attend depuis {waited(t.created_at)}
          </span>
        </li>
      ))}
    </ol>
  );
}
