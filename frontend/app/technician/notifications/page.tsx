"use client";

import { NotificationList } from "@/components/notifications";
import { api, NotificationsResponse } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function NotificationsPage() {
  const { data, error, reload } = useApi<NotificationsResponse>("/notifications/", 8_000);

  async function markRead(id: number) {
    await api(`/notifications/${id}/read/`, { method: "POST" });
    reload();
  }

  async function markAll() {
    await api("/notifications/read-all/", { method: "POST" });
    reload();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        {(data?.unread_count ?? 0) > 0 && (
          <button onClick={markAll} className="text-sm text-blue-600 underline">
            Tout marquer comme lu
          </button>
        )}
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <NotificationList items={data?.results ?? []} onRead={markRead} />
    </>
  );
}
