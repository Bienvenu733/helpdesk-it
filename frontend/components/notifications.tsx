"use client";

import { BellRing, Inbox } from "lucide-react";
import Link from "next/link";
import { NotificationItem } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { EmptyState } from "./ui";

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
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-ink"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-fill text-white">
          <BellRing className="size-4" aria-hidden />
        </span>
        <span>{latest.message}</span>
      </span>
      <span className="flex gap-4 font-medium">
        <Link
          href={`/tickets/${latest.ticket_id}`}
          onClick={() => onRead(latest.id)}
          className="text-primary-strong hover:underline"
        >
          Ouvrir le ticket
        </Link>
        <button onClick={() => onRead(latest.id)} className="text-ink-2 hover:text-ink">
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
  if (items.length === 0) {
    return <EmptyState icon={Inbox}>Aucune notification pour le moment.</EmptyState>;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((n) => (
        <li key={n.id} className="flex items-start gap-4 px-5 py-4">
          <span
            className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.is_read ? "bg-line-strong" : "bg-primary"}`}
            aria-label={n.is_read ? "Lue" : "Non lue"}
          />
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${n.is_read ? "text-ink-2" : "font-medium text-ink"}`}>{n.message}</p>
            <p className="mt-0.5 text-xs text-ink-2">{timeAgo(n.created_at)}</p>
          </div>
          <div className="flex shrink-0 gap-4 text-sm">
            <Link href={`/tickets/${n.ticket_id}`} className="font-medium text-primary-strong hover:underline">
              Ouvrir
            </Link>
            {!n.is_read && (
              <button onClick={() => onRead(n.id)} className="text-ink-2 hover:text-ink">
                Marquer lue
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
