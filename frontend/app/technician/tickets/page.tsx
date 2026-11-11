"use client";

import { TicketsTable } from "@/components/tickets-table";
import { Card, ErrorNote, Reveal } from "@/components/ui";
import { CATEGORY_LABEL, Ticket } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { matchesQuery, useSearch } from "@/lib/search";

export default function MyTicketsPage() {
  const { data, error } = useApi<Ticket[]>("/tickets/mine/", 10_000);
  const { query } = useSearch();
  const tickets = (data ?? []).filter((t) => matchesQuery(query, [t.id, t.title, t.created_by, CATEGORY_LABEL[t.category]]));
  const active = (data ?? []).filter((t) => t.status === "IN_PROGRESS").length;

  return (
    <Reveal>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card
        title={`${tickets.length} ticket${tickets.length > 1 ? "s" : ""}`}
        bodyClassName="pt-4"
        action={<span className="text-sm text-ink-2">{active > 0 ? "1 en cours" : "Aucun en cours"}</span>}
      >
        <TicketsTable tickets={tickets} showAuthor showResolved emptyText="Aucun ticket pour l'instant." />
      </Card>
    </Reveal>
  );
}
