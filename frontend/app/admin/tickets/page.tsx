"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  statusLabel,
  STATUS_LABEL,
  Ticket,
} from "@/lib/api";
import { useApi } from "@/lib/hooks";

const select =
  "rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700";

export default function AdminTicketsPage() {
  const { data, error } = useApi<Ticket[]>("/tickets/", 15_000);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const tickets = (data ?? []).filter((t) => {
    if (status === "WAITING") {
      if (!(t.status === "OPEN" && t.assigned_to_id === null)) return false;
    } else if (status && t.status !== status) return false;
    if (priority && t.priority !== priority) return false;
    if (category && t.category !== category) return false;
    return true;
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Tickets</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <select className={select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut">
          <option value="" className="text-black">Tous les statuts</option>
          <option value="WAITING" className="text-black">En attente</option>
          {(["IN_PROGRESS", "RESOLVED"] as const).map((k) => (
            <option key={k} value={k} className="text-black">{STATUS_LABEL[k]}</option>
          ))}
        </select>
        <select className={select} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priorité">
          <option value="" className="text-black">Toutes les priorités</option>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k} className="text-black">{v}</option>
          ))}
        </select>
        <select className={select} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
          <option value="" className="text-black">Toutes les catégories</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k} className="text-black">{v}</option>
          ))}
        </select>
        <span className="self-center text-sm text-zinc-500">{tickets.length} ticket(s)</span>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-300 dark:border-zinc-700">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Titre</th>
              <th className="px-3 py-2">Catégorie</th>
              <th className="px-3 py-2">Priorité</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Technicien</th>
              <th className="px-3 py-2">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
                <td className="px-3 py-2 text-zinc-500">{t.id}</td>
                <td className="px-3 py-2">
                  <Link href={`/tickets/${t.id}`} className="text-blue-600 underline">
                    {t.title}
                  </Link>
                </td>
                <td className="px-3 py-2">{CATEGORY_LABEL[t.category]}</td>
                <td className="px-3 py-2">{PRIORITY_LABEL[t.priority]}</td>
                <td className="px-3 py-2">{statusLabel(t)}</td>
                <td className="px-3 py-2">{t.assigned_to ?? "–"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(t.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                  Aucun ticket.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
