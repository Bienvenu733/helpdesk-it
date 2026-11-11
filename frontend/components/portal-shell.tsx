"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "@/lib/api";

export type NavItem = {
  href: string;
  label: string;
  /** Petit compteur à droite du libellé (ex. notifications non lues). */
  badge?: number;
};

/** Structure commune des espaces Administration et Technicien : barre latérale + contenu. */
export function PortalShell({
  subtitle,
  username,
  nav,
  rootHref,
  banner,
  children,
}: {
  subtitle: string;
  username: string;
  nav: NavItem[];
  /** Lien d'accueil de l'espace : seul son chemin exact le met en surbrillance. */
  rootHref: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  const link = "rounded px-3 py-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-zinc-300 md:w-56 md:shrink-0 md:border-b-0 md:border-r dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <div>
            <p className="font-semibold">HelpDesk IT</p>
            <p className="text-xs text-zinc-500">{subtitle}</p>
          </div>
          <p className="text-xs text-zinc-500 md:mt-6">
            Connecté : <span className="font-medium">{username}</span>
          </p>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-0">
          {nav.map((item) => {
            const active =
              item.href === rootHref ? pathname === rootHref : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-2 whitespace-nowrap rounded px-3 py-2 text-sm ${
                  active
                    ? "bg-zinc-200 font-medium dark:bg-zinc-800"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {item.label}
                {item.badge ? (
                  <span
                    aria-label={`${item.badge} non lue(s)`}
                    className="rounded-full bg-red-600 px-1.5 text-xs font-medium text-white"
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden flex-col gap-1 px-2 py-4 text-sm md:flex">
          <button onClick={logout} className={`${link} text-left`}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        {banner}
        {children}
      </main>
    </div>
  );
}
