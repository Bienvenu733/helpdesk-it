"use client";

import { CircleCheck, Hourglass, Timer, TrendingUp, Wrench } from "lucide-react";
import { useState } from "react";
import { CategoryBadge, PriorityBadge } from "@/components/badges";
import { GroupedBarChart } from "@/components/charts";
import { Badge, Button, Card, ErrorNote, LinkButton, Reveal, StatCard, Tabs } from "@/components/ui";
import { api, TechStats } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useApi } from "@/lib/hooks";

export default function TechnicianDashboard() {
  const { data: s, error, reload } = useApi<TechStats>("/technician/stats/", 8_000);
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState(false);
  const [range, setRange] = useState<"7" | "14">("14");

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

  if (!s) {
    return error ? <ErrorNote>{error}</ErrorNote> : <p className="text-sm text-ink-2">Chargement…</p>;
  }

  const cur = s.current_ticket;

  return (
    <div className="space-y-6">
      {(error || actionError) && <ErrorNote>{actionError || error}</ErrorNote>}

      <Reveal delay={0.15}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Wrench}
            tone={s.busy ? "warning" : "success"}
            label="Votre état"
            value={s.busy ? "Occupé" : "Disponible"}
            hint={s.busy ? "Un ticket en cours" : "Prêt pour le prochain ticket"}
          />
          <StatCard icon={CircleCheck} tone="success" label="Résolus aujourd'hui" value={s.resolved_today} />
          <StatCard icon={TrendingUp} tone="primary" label="Résolus au total" value={s.resolved_total} />
          <StatCard
            icon={Timer}
            tone="info"
            label="Délai moyen"
            value={s.avg_resolution_hours === null ? "–" : `${s.avg_resolution_hours} h`}
          />
        </div>
      </Reveal>

      <Reveal delay={0.25}>
        {cur ? (
          <Card className="border-warning/40" title="Ticket en cours" action={<Badge tone="warning">Occupé</Badge>}>
            <p className="text-lg font-semibold text-ink">
              #{cur.id} · {cur.title}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <CategoryBadge category={cur.category} />
              <PriorityBadge priority={cur.priority} />
              <span className="text-xs text-ink-2">signalé {timeAgo(cur.created_at)}</span>
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{cur.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <LinkButton href={`/tickets/${cur.id}`} variant="secondary">
                Ouvrir et commenter
              </LinkButton>
              <Button variant="success" disabled={busyAction} onClick={() => resolve(cur.id)}>
                <CircleCheck className="size-4" aria-hidden />
                Confirmer la résolution
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success-ink">
                <CircleCheck className="size-6" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-ink">Vous êtes disponible</p>
                <p className="text-sm text-ink-2">
                  Le prochain ticket vous sera attribué automatiquement ; vous recevrez une notification.
                  {s.waiting_count > 0 && ` ${s.waiting_count} ticket(s) attendent actuellement un technicien.`}
                </p>
              </div>
            </div>
          </Card>
        )}
      </Reveal>

      <Reveal delay={0.35}>
        <Card
          title="Votre activité"
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
          <GroupedBarChart points={s.per_day.slice(-Number(range))} labels={["Reçus", "Résolus"]} />
        </Card>
      </Reveal>

      {s.waiting_count > 0 && (
        <Reveal delay={0.4}>
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <Hourglass className="size-4" aria-hidden />
            {s.waiting_count} ticket(s) en file d&apos;attente (leur contenu reste privé jusqu&apos;à leur attribution).
          </p>
        </Reveal>
      )}
    </div>
  );
}
