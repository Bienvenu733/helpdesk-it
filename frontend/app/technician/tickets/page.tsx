"use client";

import Link from "next/link";
import { CATEGORY_LABEL, PRIORITY_LABEL, statusLabel, Ticket } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function MyTicketsPage() {
  const { data, error } = useApi<Ticket[]>("/tickets/mine/", 10_000);
  const tickets = data ?? [];
  const active = tickets.filter((t) => t.status === "IN_PROGRESS");

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Mes tickets</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {active.length > 0 ? "1 ticket en cours" : "Aucun ticket en cours"} ·{" "}
        {tickets.length - active.length} traité(s) au total
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded border border-zinc-300 dark:border-zinc-700">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Titre</th>
              <th className="px-3 py-2">Catégorie</th>
              <th className="px-3 py-2">Priorité</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Reçu le</th>
              <th className="px-3 py-2">Résolu le</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-zinc-200 last:border-0 dark:border-zinc-800 ${
                  t.status === "IN_PROGRESS" ? "bg-amber-50 dark:bg-amber-950/30" : ""
                }`}
              >
                <td className="px-3 py-2 text-zinc-500">{t.id}</td>
                <td className="px-3 py-2">
                  <Link href={`/tickets/${t.id}`} className="text-blue-600 underline">
                    {t.title}
                  </Link>
                </td>
                <td className="px-3 py-2">{CATEGORY_LABEL[t.category]}</td>
                <td className="px-3 py-2">{PRIORITY_LABEL[t.priority]}</td>
                <td className="px-3 py-2">{statusLabel(t)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(t.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {t.resolved_at ? new Date(t.resolved_at).toLocaleDateString("fr-FR") : "–"}
                </td>
              </tr>
            ))}
            {tickets.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                  Aucun ticket pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
