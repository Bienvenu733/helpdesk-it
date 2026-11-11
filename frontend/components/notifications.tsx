"use client";

import Link from "next/link";
import { NotificationItem } from "@/lib/api";

/** Bandeau affichant la notification non lue la plus récente. */
export function NotificationBanner({
  latest,
  onRead,
}: {
  latest: NotificationItem | undefined;
  onRead: (id: number) => void;
}) {
  if (!latest) return null;
  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded border border-blue-600 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100"
    >
      <span>
        <span className="font-medium">Nouvelle notification.</span> {latest.message}
      </span>
      <span className="flex gap-3">
        <Link
          href={`/tickets/${latest.ticket_id}`}
          onClick={() => onRead(latest.id)}
          className="font-medium underline"
        >
          Ouvrir le ticket
        </Link>
        <button onClick={() => onRead(latest.id)} className="underline">
          Marquer comme lue
        </button>
      </span>
    </div>
  );
}

/** Liste des notifications, les non lues en évidence. */
export function NotificationList({
  items,
  onRead,
}: {
  items: NotificationItem[];
  onRead: (id: number) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.length === 0 && <li className="text-sm text-zinc-500">Aucune notification.</li>}
      {items.map((n) => (
        <li
          key={n.id}
          className={`flex items-start justify-between gap-3 rounded border px-4 py-3 text-sm ${
            n.is_read
              ? "border-zinc-300 text-zinc-500 dark:border-zinc-700"
              : "border-blue-600 bg-blue-50 dark:bg-blue-950"
          }`}
        >
          <span>
            {n.message}
            <span className="block text-xs text-zinc-500">
              {new Date(n.created_at).toLocaleString("fr-FR")}
            </span>
          </span>
          <span className="flex shrink-0 gap-3">
            <Link href={`/tickets/${n.ticket_id}`} className="text-blue-600 underline">
              Ouvrir
            </Link>
            {!n.is_read && (
              <button onClick={() => onRead(n.id)} className="underline">
                Marquer lue
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
