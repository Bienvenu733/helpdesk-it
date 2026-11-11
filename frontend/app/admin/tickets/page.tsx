"use client";

import { useState } from "react";
import { TicketsTable } from "@/components/tickets-table";
import { Card, ErrorNote, field, Reveal } from "@/components/ui";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, Ticket } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { matchesQuery, useSearch } from "@/lib/search";

export default function AdminTicketsPage() {
  const { data, error } = useApi<Ticket[]>("/tickets/", 15_000);
  const { query } = useSearch();
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const tickets = (data ?? []).filter((t) => {
    if (status === "WAITING") {
      if (!(t.status === "OPEN" && t.assigned_to_id === null)) return false;
    } else if (status && t.status !== status) return false;
    if (priority && t.priority !== priority) return false;
    if (category && t.category !== category) return false;
    return matchesQuery(query, [t.id, t.title, t.created_by, t.assigned_to, CATEGORY_LABEL[t.category]]);
  });

  return (
    <Reveal>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card
        title={`${tickets.length} ticket${tickets.length > 1 ? "s" : ""}`}
        bodyClassName="pt-4"
        action={
          <div className="flex flex-wrap gap-2">
            <select className={`${field} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut">
              <option value="">Tous les statuts</option>
              <option value="WAITING">En attente</option>
              {(["IN_PROGRESS", "RESOLVED"] as const).map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABEL[k]}
                </option>
              ))}
            </select>
            <select className={`${field} w-auto`} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priorité">
              <option value="">Toutes les priorités</option>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select className={`${field} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
              <option value="">Toutes les catégories</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <TicketsTable tickets={tickets} showAuthor showTech emptyText="Aucun ticket ne correspond aux filtres." />
      </Card>
    </Reveal>
  );
}
