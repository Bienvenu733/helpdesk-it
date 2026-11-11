"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { Ticket } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { CategoryBadge, PriorityBadge, StatusBadge } from "./badges";
import { EmptyState, td, th, tableHead, tableRow, tableWrap } from "./ui";

/** Liste de tickets : les colonnes dépendent de ce que le rôle a le droit de voir. */
export function TicketsTable({
  tickets,
  showAuthor = false,
  showTech = false,
  showResolved = false,
  compact = false,
  emptyText = "Aucun ticket.",
}: {
  tickets: Ticket[];
  showAuthor?: boolean;
  showTech?: boolean;
  showResolved?: boolean;
  /** Version resserrée (pas de colonne catégorie) pour les cartes étroites. */
  compact?: boolean;
  emptyText?: string;
}) {
  if (tickets.length === 0) return <EmptyState icon={Inbox}>{emptyText}</EmptyState>;

  const name = (s: string | null) => (s ? s.replace(/ \(.*\)$/, "") : "–");

  return (
    <div className={tableWrap}>
      <table className="w-full">
        <thead className={tableHead}>
          <tr>
            <th className={th}>N°</th>
            <th className={th}>Titre</th>
            {!compact && <th className={th}>Catégorie</th>}
            <th className={th}>Priorité</th>
            <th className={th}>Statut</th>
            {showAuthor && <th className={th}>Auteur</th>}
            {showTech && <th className={th}>Technicien</th>}
            <th className={th}>Créé le</th>
            {showResolved && <th className={th}>Résolu le</th>}
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} className={tableRow}>
              <td className={`${td} text-ink-2 tabular-nums`}>#{t.id}</td>
              <td className={`${td} max-w-72 truncate font-medium`}>
                <Link href={`/tickets/${t.id}`} className="hover:text-primary-strong hover:underline">
                  {t.title}
                </Link>
              </td>
              {!compact && (
                <td className={td}>
                  <CategoryBadge category={t.category} />
                </td>
              )}
              <td className={td}>
                <PriorityBadge priority={t.priority} />
              </td>
              <td className={td}>
                <StatusBadge ticket={t} />
              </td>
              {showAuthor && <td className={`${td} text-ink-2`}>{name(t.created_by)}</td>}
              {showTech && <td className={`${td} text-ink-2`}>{name(t.assigned_to)}</td>}
              <td className={`${td} whitespace-nowrap text-ink-2`}>{shortDate(t.created_at)}</td>
              {showResolved && (
                <td className={`${td} whitespace-nowrap text-ink-2`}>{t.resolved_at ? shortDate(t.resolved_at) : "–"}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
