"use client";

import { QueueList, waitingQueue } from "@/components/queue-list";
import { AdminUser, Ticket } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function QueuePage() {
  const tickets = useApi<Ticket[]>("/tickets/", 10_000);
  const users = useApi<AdminUser[]>("/admin/users/", 10_000);

  const free = (users.data ?? []).filter((u) => u.role === "TECHNICIAN" && !u.busy);

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">File d&apos;attente</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Ces tickets attendent un technicien libre. Dès qu&apos;un technicien confirme une
        résolution, le ticket le plus urgent lui est attribué automatiquement.
      </p>

      <p className="mb-4 text-sm">
        Techniciens disponibles :{" "}
        <span className="font-medium">
          {free.length > 0 ? free.map((u) => u.username).join(", ") : "aucun"}
        </span>
      </p>

      <QueueList tickets={waitingQueue(tickets.data ?? [])} />
    </>
  );
}
