"use client";

import { Button, Card, ErrorNote, Reveal } from "@/components/ui";
import { NotificationList } from "@/components/notifications";
import { api, NotificationsResponse } from "@/lib/api";
import { useApi } from "@/lib/hooks";

/** Page des notifications, commune à l'utilisateur et au technicien. */
export function NotificationsPage() {
  const { data, error, reload } = useApi<NotificationsResponse>("/notifications/", 8_000);

  async function markRead(id: number) {
    await api(`/notifications/${id}/read/`, { method: "POST" });
    reload();
  }

  async function markAll() {
    await api("/notifications/read-all/", { method: "POST" });
    reload();
  }

  const unread = data?.unread_count ?? 0;

  return (
    <Reveal>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card
        title={unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
        bodyClassName="pt-2"
        action={
          unread > 0 && (
            <Button variant="secondary" onClick={markAll} className="py-1.5 text-xs">
              Tout marquer comme lu
            </Button>
          )
        }
      >
        <NotificationList items={data?.results ?? []} onRead={markRead} />
      </Card>
    </Reveal>
  );
}
