"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PortalShell } from "@/components/portal-shell";
import { Me } from "@/lib/api";
import { useApi } from "@/lib/hooks";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/queue", label: "File d'attente" },
  { href: "/admin/team", label: "Équipe technique" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/activity", label: "Activité" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me } = useApi<Me>("/auth/me/");

  // Seul un administrateur entre ici ; les autres retournent à leur espace.
  useEffect(() => {
    if (me && me.role !== "ADMIN") {
      router.replace(me.role === "TECHNICIAN" ? "/technician" : "/tickets");
    }
  }, [me, router]);

  // Tant que l'accès n'est pas confirmé, on affiche un message de chargement, mais on rend
  // quand même la page (cachée) : Next.js doit pouvoir la rendre pour vérifier que la
  // navigation est instantanée. La vraie protection est côté serveur (l'API refuse les
  // non-administrateurs), pas ici.
  if (!me || me.role !== "ADMIN") {
    return (
      <>
        <p className="p-8 text-sm text-zinc-500">Chargement…</p>
        <div hidden>{children}</div>
      </>
    );
  }

  return (
    <PortalShell subtitle="Administration" username={me.username} nav={NAV} rootHref="/admin">
      {children}
    </PortalShell>
  );
}
