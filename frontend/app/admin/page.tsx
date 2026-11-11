"use client";

import { Activity, CircleCheck, Gauge, Hourglass, Ticket, Timer, TriangleAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActivityFeed } from "@/components/activity";
import { BarList, DonutChart, GroupedBarChart } from "@/components/charts";
import { TeamTable } from "@/components/team-table";
import { Card, ErrorNote, Reveal, StatCard, Tabs } from "@/components/ui";
import { ActivityEvent, AdminStats, AdminUser } from "@/lib/api";
import { useApi } from "@/lib/hooks";

// Une couleur par catégorie de panne (variables de globals.css, palette validée clair et sombre)
const CATEGORY_COLOR: Record<string, string> = {
  HARDWARE: "var(--cat-1)",
  NETWORK: "var(--cat-2)",
  SOFTWARE: "var(--cat-3)",
  ACCESS: "var(--cat-4)",
  OTHER: "var(--cat-5)",
};

export default function OverviewPage() {
  const { data: s, error } = useApi<AdminStats>("/admin/stats/", 15_000);
  const users = useApi<AdminUser[]>("/admin/users/", 15_000).data;
  const activity = useApi<ActivityEvent[]>("/admin/activity/", 15_000).data;
  const [range, setRange] = useState<"7" | "14">("14");

  if (!s) {
    return error ? <ErrorNote>{error}</ErrorNote> : <p className="text-sm text-ink-2">Chargement…</p>;
  }

  const t = s.totals;
  const points = s.per_day.slice(-Number(range));
  const slaRate = s.sla?.complianceRate;
  // « Clôturé » n'existe pas dans le flux réel, et un ticket « ouvert » est en fait en attente d'un technicien.
  const statusRows = s.by_status
    .filter((r) => r.key !== "CLOSED")
    .map((r) => (r.key === "OPEN" ? { ...r, label: "En attente" } : r));

  return (
    <div className="space-y-6">
      {error && <ErrorNote>{error}</ErrorNote>}

      <Reveal delay={0.15}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Ticket} tone="info" label="Tickets au total" value={t.total} />
          <StatCard icon={Activity} tone="primary" label="En cours" value={t.in_progress} />
          <StatCard icon={CircleCheck} tone="success" label="Résolus" value={t.resolved} />
          <StatCard
            icon={Hourglass}
            tone="warning"
            label="En attente"
            value={t.waiting}
            hint={t.waiting > 0 ? "Aucun technicien libre" : "File vide"}
          />
          <StatCard
            icon={Gauge}
            tone="primary"
            label="SLA respecté"
            value={slaRate == null ? "–" : `${slaRate} %`}
            hint={s.sla ? "Calculé par Oracle (PL/SQL)" : "Service SLA indisponible"}
          />
          <StatCard
            icon={TriangleAlert}
            tone="danger"
            label="Tickets en retard"
            value={s.sla ? s.sla.overdue : "–"}
            alert={!!s.sla && s.sla.overdue > 0}
          />
          <StatCard
            icon={Timer}
            tone="info"
            label="Délai moyen"
            value={s.avg_resolution_hours === null ? "–" : `${s.avg_resolution_hours} h`}
            hint="De la création à la résolution"
          />
          <StatCard
            icon={Wrench}
            tone="violet"
            label="Techniciens occupés"
            value={`${t.technicians_busy} / ${t.technicians}`}
            hint={`${t.technicians - t.technicians_busy} disponible(s)`}
          />
        </div>
      </Reveal>

      <Reveal delay={0.25}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Card
            className="xl:col-span-3"
            title="Activité des tickets"
            action={
              <Tabs
                value={range}
                onChange={setRange}
                options={[
                  { value: "7", label: "7 jours" },
                  { value: "14", label: "14 jours" },
                ]}
              />
            }
          >
            <GroupedBarChart points={points} labels={["Créés", "Résolus"]} />
          </Card>

          <Card className="xl:col-span-2" title="Pannes par catégorie" bodyClassName="flex items-center p-5">
            <DonutChart
              centerLabel="Tickets au total"
              rows={s.by_category.map((c) => ({ ...c, color: CATEGORY_COLOR[c.key] ?? "var(--cat-5)" }))}
            />
          </Card>
        </div>
      </Reveal>

      <Reveal delay={0.35}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card
            title="Activité récente"
            action={
              <Link href="/admin/activity" className="text-sm font-medium text-primary-strong hover:underline">
                Tout voir
              </Link>
            }
          >
            <ActivityFeed events={activity ?? []} limit={5} />
          </Card>

          <Card title="Équipe technique" bodyClassName="pt-4 pb-2">
            <TeamTable users={users ?? []} />
          </Card>
        </div>
      </Reveal>

      <Reveal delay={0.45}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card title="Tickets par priorité">
            <BarList rows={s.by_priority} />
          </Card>
          <Card title="Tickets par statut">
            <BarList rows={statusRows} />
          </Card>
        </div>
      </Reveal>
    </div>
  );
}
