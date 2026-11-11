"use client";

import Link from "next/link";
import { BarList } from "@/components/charts";
import { PriorityBadge } from "@/components/badges";
import { Avatar, Badge, Card, ErrorNote, Reveal } from "@/components/ui";
import { AdminUser } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function TeamPage() {
  const { data, error } = useApi<AdminUser[]>("/admin/users/", 10_000);
  const team = (data ?? []).filter((u) => u.role === "TECHNICIAN");
  const busy = team.filter((u) => u.busy).length;

  return (
    <Reveal className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <p className="text-sm text-ink-2">
        {team.length} technicien(s) : {busy} occupé(s), {team.length - busy} disponible(s). Un technicien traite un ticket à la
        fois et redevient disponible quand il confirme la résolution.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {team.map((u) => (
          <Card key={u.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <Avatar name={u.username} size="lg" />
                <span>
                  <span className="block font-semibold text-ink">{u.username}</span>
                  <span className="block text-xs text-ink-2">{u.resolved_count} ticket(s) résolu(s)</span>
                </span>
              </span>
              <Badge tone={u.busy ? "warning" : "success"}>{u.busy ? "Occupé" : "Disponible"}</Badge>
            </div>

            <div className="mt-4 border-t border-line pt-4 text-sm">
              {u.current_tickets.length > 0 ? (
                u.current_tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3">
                    <Link href={`/tickets/${t.id}`} className="min-w-0 truncate font-medium text-ink hover:text-primary-strong hover:underline">
                      #{t.id} · {t.title}
                    </Link>
                    <PriorityBadge priority={t.priority} />
                  </div>
                ))
              ) : (
                <p className="text-ink-2">Aucun ticket en cours.</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card title="Tickets résolus par technicien">
        <BarList
          sort
          rows={team.map((u) => ({ key: String(u.id), label: u.username, count: u.resolved_count }))}
        />
      </Card>
    </Reveal>
  );
}
