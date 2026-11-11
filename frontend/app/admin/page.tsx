"use client";

import { BarList, DailyChart } from "@/components/charts";
import { AdminStats } from "@/lib/api";
import { useApi } from "@/lib/hooks";

function Kpi({
  label,
  value,
  hint,
  alert = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded border p-4 ${
        alert ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${alert ? "text-red-600" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-zinc-300 p-4 dark:border-zinc-700">
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

export default function OverviewPage() {
  const { data: s, error } = useApi<AdminStats>("/admin/stats/", 15_000);

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Vue d&apos;ensemble</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!s ? (
        !error && <p className="text-sm text-zinc-500">Chargement…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Tickets au total" value={s.totals.total} />
            <Kpi
              label="En attente"
              value={s.totals.waiting}
              hint="Aucun technicien libre"
              alert={s.totals.waiting > 0}
            />
            <Kpi label="En cours" value={s.totals.in_progress} />
            <Kpi label="Résolus" value={s.totals.resolved} />
            <Kpi
              label="Techniciens occupés"
              value={`${s.totals.technicians_busy} / ${s.totals.technicians}`}
              hint={`${s.totals.technicians - s.totals.technicians_busy} disponible(s)`}
            />
            <Kpi
              label="Délai moyen de résolution"
              value={s.avg_resolution_hours === null ? "–" : `${s.avg_resolution_hours} h`}
            />
            <Kpi
              label="SLA respecté"
              value={
                s.sla?.complianceRate == null ? "–" : `${s.sla.complianceRate} %`
              }
              hint={s.sla ? undefined : "Service SLA indisponible"}
            />
            <Kpi
              label="Tickets en retard"
              value={s.sla ? s.sla.overdue : "–"}
              alert={!!s.sla && s.sla.overdue > 0}
            />
          </div>

          <div className="mb-4">
            <Card title="Activité des 14 derniers jours">
              <DailyChart points={s.per_day} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Pannes par catégorie">
              <BarList rows={s.by_category} sort />
            </Card>
            <Card title="Tickets par priorité">
              <BarList rows={s.by_priority} />
            </Card>
            <Card title="Tickets par statut">
              <BarList rows={s.by_status} />
            </Card>
          </div>
        </>
      )}
    </>
  );
}
