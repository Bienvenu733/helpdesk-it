"use client";

import { AppShell } from "@/components/app-shell";
import { NotificationsPage } from "@/components/notifications-page";

export default function UserNotifications() {
  return (
    <AppShell allow={["USER"]}>
      <NotificationsPage />
    </AppShell>
  );
}
