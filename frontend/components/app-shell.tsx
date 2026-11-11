"use client";

import {
  Activity,
  Bell,
  ChevronDown,
  Headset,
  Hourglass,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  Moon,
  Search,
  Sun,
  Ticket,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AdminUser,
  api,
  clearTokens,
  homeFor,
  Me,
  NotificationsResponse,
  Role,
  ROLE_LABEL,
} from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { SearchProvider, useSearch } from "@/lib/search";
import { setTheme, useTheme } from "@/lib/theme";
import { NotificationBanner } from "./notifications";
import { Avatar, Switch } from "./ui";

/* ------------------------------------------------------------------------------------------
   Coquille commune à tous les espaces : barre latérale, barre du haut, contenu.
   Seuls les menus changent selon le rôle.
   ------------------------------------------------------------------------------------------ */

type NavDef = { href: string; label: string; icon: LucideIcon };

const NAV: Record<Role, NavDef[]> = {
  USER: [
    { href: "/tickets", label: "Mes tickets", icon: Ticket },
    { href: "/notifications", label: "Notifications", icon: Bell },
  ],
  TECHNICIAN: [
    { href: "/technician", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/technician/tickets", label: "Mes tickets", icon: Ticket },
    { href: "/technician/notifications", label: "Notifications", icon: Bell },
  ],
  ADMIN: [
    { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
    { href: "/admin/tickets", label: "Tickets", icon: Ticket },
    { href: "/admin/queue", label: "File d'attente", icon: Hourglass },
    { href: "/admin/team", label: "Équipe technique", icon: Wrench },
    { href: "/admin/users", label: "Utilisateurs", icon: Users },
    { href: "/admin/activity", label: "Activité", icon: Activity },
  ],
};

const ROOT: Record<Role, string> = { USER: "/tickets", TECHNICIAN: "/technician", ADMIN: "/admin" };
const TICKETS_HREF: Record<Role, string> = {
  USER: "/tickets",
  TECHNICIAN: "/technician/tickets",
  ADMIN: "/admin/tickets",
};
const BELL_HREF: Record<Role, string> = {
  USER: "/notifications",
  TECHNICIAN: "/technician/notifications",
  ADMIN: "/admin/activity",
};
const WORKSPACE: Record<Role, string> = {
  USER: "Espace utilisateur",
  TECHNICIAN: "Espace technicien",
  ADMIN: "Administration",
};
const TIP: Record<Role, { title: string; text: string }> = {
  USER: {
    title: "Une panne ?",
    text: "Signalez-la : un technicien libre est assigné automatiquement.",
  },
  TECHNICIAN: {
    title: "Un ticket à la fois",
    text: "Confirmez la résolution pour recevoir le suivant.",
  },
  ADMIN: {
    title: "Vue d'ensemble",
    text: "Suivez les délais, l'équipe et la file d'attente en direct.",
  },
};

function isActive(pathname: string, href: string, role: Role) {
  return href === ROOT[role] ? pathname === href : pathname.startsWith(href);
}

export function AppShell({ children, allow }: { children: React.ReactNode; allow?: Role[] }) {
  return (
    <SearchProvider>
      <Shell allow={allow}>{children}</Shell>
    </SearchProvider>
  );
}

function Shell({ children, allow }: { children: React.ReactNode; allow?: Role[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { query, setQuery } = useSearch();
  const searchRef = useRef<HTMLInputElement>(null);

  const me = useApi<Me>("/auth/me/").data;
  const notifs = useApi<NotificationsResponse>("/notifications/", 8_000);
  // La liste des collaborateurs (avatars) n'est lisible que par l'administrateur.
  const team = useApi<AdminUser[]>(me?.role === "ADMIN" ? "/admin/users/" : null, 60_000).data;

  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);

  const allowed = !!me && (!allow || allow.includes(me.role));

  // Un rôle qui n'a rien à faire ici est renvoyé vers son propre espace.
  useEffect(() => {
    if (me && allow && !allow.includes(me.role)) router.replace(homeFor(me.role));
  }, [me, allow, router]);

  // Raccourci Ctrl/⌘ + K : place le curseur dans la recherche.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Ferme le menu utilisateur quand on clique ailleurs.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);

  // Tant que l'accès n'est pas confirmé, on affiche « Chargement » mais on rend quand même la
  // page (cachée) : Next.js doit pouvoir la rendre pour vérifier la navigation instantanée.
  // La vraie protection reste côté serveur : l'API refuse les rôles non autorisés.
  if (!me || !allowed) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-2">Chargement…</div>
        <div hidden>{children}</div>
      </>
    );
  }

  const role = me.role;
  const nav = NAV[role];
  const unread = notifs.data?.unread_count ?? 0;
  const activeItem = [...nav]
    .filter((n) => isActive(pathname, n.href, role))
    .sort((a, b) => b.href.length - a.href.length)[0];
  // Sur la page d'un ticket, c'est « Mes tickets » (ou « Tickets ») qui reste surligné dans le menu.
  const highlighted =
    activeItem ?? (pathname.startsWith("/tickets/") ? nav.find((n) => n.href === TICKETS_HREF[role]) : undefined);
  const title = activeItem?.label ?? "Détail du ticket";
  const showBanner = role !== "ADMIN";
  const tip = TIP[role];

  async function markRead(id: number) {
    await api(`/notifications/${id}/read/`, { method: "POST" });
    notifs.reload();
  }

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  const technicians = (team ?? []).filter((u) => u.role === "TECHNICIAN");

  return (
    <div className="flex min-h-screen bg-bg">
      {drawer && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setDrawer(false)} aria-hidden />
      )}

      {/* ---------------------------- Barre latérale ---------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 shrink-0 border-r border-line-strong bg-surface transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          drawer ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="anim-slide-left flex h-full flex-col">
          <div className="flex h-16 items-center justify-between gap-3 px-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary-fill text-white">
                <Headset className="size-5" aria-hidden />
              </span>
              <div className="leading-tight">
                <p className="text-[15px] font-semibold text-ink">HelpDesk IT</p>
                <p className="text-xs text-ink-2">{WORKSPACE[role]}</p>
              </div>
            </div>
            <button
              className="rounded-lg p-1 text-ink-2 hover:bg-surface-2 lg:hidden"
              onClick={() => setDrawer(false)}
              aria-label="Fermer le menu"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
            {nav.map((item) => {
              const active = item === highlighted;
              const badge = item.icon === Bell ? unread : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawer(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary-fill text-white shadow-sm"
                      : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <item.icon className="size-[18px] shrink-0" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span className="min-w-5 rounded-full bg-[#dc2626] px-1.5 text-center text-[11px] font-semibold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 px-3 pb-4">
            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-2">
              <span className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="size-[18px]" aria-hidden /> : <Sun className="size-[18px]" aria-hidden />}
                Mode sombre
              </span>
              <Switch
                checked={theme === "dark"}
                onChange={(on) => setTheme(on ? "dark" : "light")}
                label="Activer le mode sombre"
              />
            </div>

            <div className="rounded-xl bg-linear-to-br from-[#5c5fef] to-[#8b5cf6] p-4 text-white">
              <p className="text-sm font-semibold">{tip.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/85">{tip.text}</p>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="size-[18px]" aria-hidden />
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------------------ Contenu ------------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="anim-slide-down sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line-strong bg-surface px-4 lg:px-8">
          <button
            className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 lg:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="truncate text-lg font-semibold text-ink">{title}</h1>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {technicians.length > 0 && (
              <div className="hidden items-center md:flex" title="Équipe technique">
                <div className="flex -space-x-1.5">
                  {technicians.slice(0, 3).map((t) => (
                    <Avatar key={t.id} name={t.username} size="md" ring />
                  ))}
                </div>
                {technicians.length > 3 && (
                  <span className="-ml-1.5 flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-strong ring-2 ring-surface">
                    +{technicians.length - 3}
                  </span>
                )}
              </div>
            )}

            <Link
              href={BELL_HREF[role]}
              className="relative rounded-lg p-2 text-ink-2 hover:bg-surface-2 hover:text-ink"
              aria-label={unread > 0 ? `${unread} notification(s) non lue(s)` : "Notifications"}
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>

            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pathname !== TICKETS_HREF[role]) router.push(TICKETS_HREF[role]);
                  if (e.key === "Escape") e.currentTarget.blur();
                }}
                placeholder="Rechercher un ticket…"
                aria-label="Rechercher un ticket"
                className="h-9 w-56 rounded-lg border border-line-strong bg-surface-2 pr-12 pl-9 text-sm text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 lg:w-64"
              />
              <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-line-strong bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-2">
                ⌘K
              </kbd>
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu((m) => !m);
                }}
                className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-surface-2"
                aria-haspopup="menu"
                aria-expanded={menu}
              >
                <Avatar name={me.username} />
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-sm font-medium text-ink">{me.username}</span>
                  <span className="block text-xs text-ink-2">{ROLE_LABEL[role]}</span>
                </span>
                <ChevronDown className="hidden size-4 text-ink-2 md:block" aria-hidden />
              </button>
              {menu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-(--shadow-pop)"
                >
                  <p className="px-3 py-2 text-xs text-ink-2">
                    Connecté en tant que <b className="text-ink">{me.username}</b>
                  </p>
                  <button
                    role="menuitem"
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-2"
                  >
                    <LogOut className="size-4" aria-hidden />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            {showBanner && (
              <NotificationBanner latest={notifs.data?.results.find((n) => !n.is_read)} onRead={markRead} />
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
