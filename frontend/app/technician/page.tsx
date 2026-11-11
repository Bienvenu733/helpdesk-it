"use client";

import Link from "next/link";
import { useState } from "react";
import { DailyChart } from "@/components/charts";
import { api, CATEGORY_LABEL, PRIORITY_LABEL, TechStats } from "@/lib/api";
import { useApi } from "@/lib/hooks";

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded border border-zinc-300 p-4 dark:border-zinc-700">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function TechnicianDashboard() {
  const { data: s, error, reload } = useApi<TechStats>("/technician/stats/", 8_000);
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  async function resolve(id: number) {
    setActionError("");
    setBusyAction(true);
    try {
      await api(`/tickets/${id}/resolve/`, { method: "POST" });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusyAction(false);
    }
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Tableau de bord</h1>
      {(error || actionError) && (
        <p className="mb-4 text-sm text-red-600">{actionError || error}</p>
      )}

      {!s ? (
        !error && <p className="text-sm text-zinc-500">Chargement…</p>
      ) : (
        <>
          {s.current_ticket ? (
            <section className="mb-6 rounded border border-amber-600 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium">Ticket en cours</h2>
                <span className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white">Occupé</span>
              </div>
              <p className="text-lg font-semibold">
                #{s.current_ticket.id} {s.current_ticket.title}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {CATEGORY_LABEL[s.current_ticket.category]} ·{" "}
                {PRIORITY_LABEL[s.current_ticket.priority]}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{s.current_ticket.description}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/tickets/${s.current_ticket.id}`}
                  className="rounded border border-zinc-400 px-4 py-2 text-sm"
                >
                  Ouvrir et commenter
                </Link>
                <button
                  disabled={busyAction}
                  onClick={() => resolve(s.current_ticket!.id)}
                  className="rounded bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Confirmer la résolution
                </button>
              </div>
            </section>
          ) : (
            <section className="mb-6 rounded border border-green-700 p-4">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-medium">Vous êtes disponible</h2>
                <span className="rounded bg-green-700 px-2 py-0.5 text-xs text-white">
                  Disponible
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                Aucun ticket en cours. Le prochain ticket vous sera attribué automatiquement et
                vous recevrez une notification.
              </p>
            </section>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Résolus aujourd'hui" value={s.resolved_today} />
            <Kpi label="Résolus au total" value={s.resolved_total} />
            <Kpi
              label="Délai moyen"
              value={s.avg_resolution_hours === null ? "–" : `${s.avg_resolution_hours} h`}
            />
            <Kpi label="En file d'attente" value={s.waiting_count} hint="Tickets sans technicien (pas de détail : chaque ticket reste privé)" />
          </div>

          <section className="rounded border border-zinc-300 p-4 dark:border-zinc-700">
            <h2 className="mb-4 text-sm font-medium">Votre activité des 14 derniers jours</h2>
            <DailyChart points={s.per_day} labels={["Reçus", "Résolus"]} />
          </section>
        </>
      )}
    </>
  );
}
