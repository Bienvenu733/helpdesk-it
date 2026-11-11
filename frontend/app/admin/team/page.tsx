"use client";

import Link from "next/link";
import { BarList } from "@/components/charts";
import { AdminUser, PRIORITY_LABEL } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function TeamPage() {
  const { data, error } = useApi<AdminUser[]>("/admin/users/", 10_000);
  const team = (data ?? []).filter((u) => u.role === "TECHNICIAN");
  const busy = team.filter((u) => u.busy).length;

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Équipe technique</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {team.length} technicien(s) : {busy} occupé(s), {team.length - busy} disponible(s).
        Un technicien traite un ticket à la fois ; il redevient disponible quand il confirme
        la résolution.
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {team.map((u) => (
          <div key={u.id} className="rounded border border-zinc-300 p-4 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="font-medium">{u.username}</span>
              <span
                className={`rounded px-2 py-0.5 text-xs text-white ${
                  u.busy ? "bg-amber-700" : "bg-green-700"
                }`}
              >
                {u.busy ? "Occupé" : "Disponible"}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{u.resolved_count} ticket(s) résolu(s)</p>

            {u.current_tickets.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {u.current_tickets.map((t) => (
                  <li key={t.id}>
                    En cours :{" "}
                    <Link href={`/tickets/${t.id}`} className="text-blue-600 underline">
                      #{t.id}
                    </Link>{" "}
                    {t.title}{" "}
                    <span className="text-xs text-zinc-500">({PRIORITY_LABEL[t.priority]})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Aucun ticket en cours.</p>
            )}
          </div>
        ))}
        {team.length === 0 && !error && (
          <p className="text-sm text-zinc-500">Aucun technicien.</p>
        )}
      </div>

      <section className="rounded border border-zinc-300 p-4 dark:border-zinc-700">
        <h2 className="mb-4 text-sm font-medium">Tickets résolus par technicien</h2>
        <BarList
          sort
          rows={team.map((u) => ({ key: String(u.id), label: u.username, count: u.resolved_count }))}
        />
      </section>
    </>
  );
}
