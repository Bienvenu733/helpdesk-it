"use client";

import { QueueList, waitingQueue } from "@/components/queue-list";
import { Avatar, Card, Reveal } from "@/components/ui";
import { AdminUser, Ticket } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { matchesQuery, useSearch } from "@/lib/search";

export default function QueuePage() {
  const tickets = useApi<Ticket[]>("/tickets/", 10_000);
  const users = useApi<AdminUser[]>("/admin/users/", 10_000);
  const { query } = useSearch();

  const free = (users.data ?? []).filter((u) => u.role === "TECHNICIAN" && !u.busy);
  const waiting = waitingQueue(tickets.data ?? []).filter((t) => matchesQuery(query, [t.id, t.title, t.created_by]));

  return (
    <Reveal className="space-y-4">
      <Card title="Techniciens disponibles">
        {free.length === 0 ? (
          <p className="text-sm text-ink-2">Aucun technicien libre : les nouveaux tickets attendent.</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {free.map((u) => (
              <li key={u.id} className="flex items-center gap-2 rounded-full border border-line-strong bg-surface-2 py-1 pr-3 pl-1 text-sm">
                <Avatar name={u.username} size="sm" />
                {u.username}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`File d'attente (${waiting.length})`} bodyClassName="pt-2">
        <p className="px-5 pb-2 text-sm text-ink-2">
          Dès qu&apos;un technicien confirme une résolution, le ticket le plus urgent (puis le plus ancien) lui est attribué
          automatiquement.
        </p>
        <QueueList tickets={waiting} />
      </Card>
    </Reveal>
  );
}
