"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NotificationBanner } from "@/components/notifications";
import { PortalShell } from "@/components/portal-shell";
import { api, Me, NotificationsResponse } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me } = useApi<Me>("/auth/me/");
  // Les notifications sont relues toutes les 8 secondes : un nouveau ticket attribué
  // apparaît presque aussitôt, sans recharger la page.
  const notifs = useApi<NotificationsResponse>("/notifications/", 8_000);

  useEffect(() => {
    if (me && me.role !== "TECHNICIAN") {
      router.replace(me.role === "ADMIN" ? "/admin" : "/tickets");
    }
  }, [me, router]);

  // Même principe que l'espace admin : la page est rendue (cachée) pendant la vérification.
  if (!me || me.role !== "TECHNICIAN") {
    return (
      <>
        <p className="p-8 text-sm text-zinc-500">Chargement…</p>
        <div hidden>{children}</div>
      </>
    );
  }

  async function markRead(id: number) {
    await api(`/notifications/${id}/read/`, { method: "POST" });
    notifs.reload();
  }

  const nav = [
    { href: "/technician", label: "Tableau de bord" },
    { href: "/technician/tickets", label: "Mes tickets" },
    {
      href: "/technician/notifications",
      label: "Notifications",
      badge: notifs.data?.unread_count ?? 0,
    },
  ];

  return (
    <PortalShell
      subtitle="Espace technicien"
      username={me.username}
      nav={nav}
      rootHref="/technician"
      banner={
        <NotificationBanner
          latest={notifs.data?.results.find((n) => !n.is_read)}
          onRead={markRead}
        />
      }
    >
      {children}
    </PortalShell>
  );
}
