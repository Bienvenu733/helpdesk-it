"use client";

import Link from "next/link";
import { ActivityEvent, EVENT_LABEL, ROLE_LABEL } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function ActivityPage() {
  const { data, error } = useApi<ActivityEvent[]>("/admin/activity/", 10_000);
  const events = data ?? [];

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Activité récente</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <ul className="flex flex-col gap-2">
        {events.length === 0 && !error && (
          <li className="text-sm text-zinc-500">Aucune activité.</li>
        )}
        {events.map((e) => (
          <li key={e.id} className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
            <span className="font-medium">{e.actor}</span>{" "}
            <span className="text-zinc-500">({ROLE_LABEL[e.actor_role]})</span>{" "}
            {EVENT_LABEL[e.event_type]}{" "}
            <Link href={`/tickets/${e.ticket_id}`} className="text-blue-600 underline">
              #{e.ticket_id}
            </Link>{" "}
            <span className="text-zinc-500">« {e.ticket_title} »</span>
            <span className="block text-xs text-zinc-500">
              {new Date(e.created_at).toLocaleString("fr-FR")}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
