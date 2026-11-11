"use client";

import { ArrowUpDown, Funnel, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminUser } from "@/lib/api";
import { Avatar, Badge, Button, EmptyState, field, td, th, tableHead, tableRow, tableWrap } from "./ui";

type Filter = "all" | "busy" | "free";

/** Équipe technique : état, ticket en cours, tickets résolus. Triable et filtrable. */
export function TeamTable({ users }: { users: AdminUser[] }) {
  const [descending, setDescending] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const rows = users
    .filter((u) => u.role === "TECHNICIAN")
    .filter((u) => filter === "all" || (filter === "busy" ? u.busy : !u.busy))
    .sort((a, b) => (descending ? b.resolved_count - a.resolved_count : a.resolved_count - b.resolved_count));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 px-5">
        <Button variant="secondary" onClick={() => setDescending((d) => !d)} className="py-1.5 text-xs">
          <ArrowUpDown className="size-3.5" aria-hidden />
          Trier ({descending ? "plus de résolus" : "moins de résolus"})
        </Button>
        <label className="relative">
          <span className="sr-only">Filtrer par état</span>
          <Funnel className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-2" aria-hidden />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className={`${field} w-auto py-1.5 pr-3 pl-8 text-xs`}
          >
            <option value="all">Tous</option>
            <option value="busy">Occupés</option>
            <option value="free">Disponibles</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Wrench}>Aucun technicien dans ce filtre.</EmptyState>
      ) : (
        <div className={tableWrap}>
          <table className="w-full">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Technicien</th>
                <th className={th}>État</th>
                <th className={th}>Ticket en cours</th>
                <th className={`${th} text-right`}>Résolus</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className={tableRow}>
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <Avatar name={u.username} size="sm" />
                      <span className="font-medium">{u.username}</span>
                    </span>
                  </td>
                  <td className={td}>
                    <Badge tone={u.busy ? "warning" : "success"}>{u.busy ? "Occupé" : "Disponible"}</Badge>
                  </td>
                  <td className={`${td} max-w-48 truncate text-ink-2`}>
                    {u.current_tickets[0] ? (
                      <Link href={`/tickets/${u.current_tickets[0].id}`} className="hover:text-primary-strong hover:underline">
                        #{u.current_tickets[0].id} · {u.current_tickets[0].title}
                      </Link>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{u.resolved_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
