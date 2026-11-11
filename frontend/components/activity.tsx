"use client";

import { CheckCircle2, MessageSquare, PlusCircle, UserCheck } from "lucide-react";
import Link from "next/link";
import { ActivityEvent, EVENT_LABEL, ROLE_LABEL } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Badge, EmptyState, Tone } from "./ui";

const VIEW: Record<
  ActivityEvent["event_type"],
  { icon: typeof PlusCircle; tone: Tone; badge: string; tile: string }
> = {
  CREATED: { icon: PlusCircle, tone: "info", badge: "Nouveau ticket", tile: "bg-info-soft text-info-ink" },
  ASSIGNED: { icon: UserCheck, tone: "warning", badge: "Attribué", tile: "bg-warning-soft text-warning-ink" },
  RESOLVED: { icon: CheckCircle2, tone: "success", badge: "Résolu", tile: "bg-success-soft text-success-ink" },
  COMMENTED: { icon: MessageSquare, tone: "violet", badge: "Commentaire", tile: "bg-violet-soft text-violet-ink" },
};

/** Fil d'activité : qui a fait quoi sur quel ticket. */
export function ActivityFeed({ events, limit }: { events: ActivityEvent[]; limit?: number }) {
  const shown = limit ? events.slice(0, limit) : events;
  if (shown.length === 0) return <EmptyState icon={MessageSquare}>Aucune activité pour le moment.</EmptyState>;

  return (
    <ul className="divide-y divide-line">
      {shown.map((e) => {
        const v = VIEW[e.event_type];
        return (
          <li key={e.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${v.tile}`}>
              <v.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                <Link href={`/tickets/${e.ticket_id}`} className="hover:text-primary-strong hover:underline">
                  Ticket #{e.ticket_id}
                </Link>{" "}
                <span className="font-normal text-ink-2">· {e.ticket_title}</span>
              </p>
              <p className="truncate text-xs text-ink-2">
                {e.actor} ({ROLE_LABEL[e.actor_role]}) {EVENT_LABEL[e.event_type]}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs text-ink-2">{timeAgo(e.created_at)}</span>
              <Badge tone={v.tone}>{v.badge}</Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
