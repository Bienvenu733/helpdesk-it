"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import {
  api,
  CATEGORY_LABEL,
  Comment,
  Me,
  PRIORITY_LABEL,
  SlaInfo,
  statusLabel,
  Ticket,
} from "@/lib/api";
import { useApi } from "@/lib/hooks";

// Texte du temps restant avant l'échéance (ou du retard).
function remaining(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const text = hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
  return ms >= 0 ? `reste ${text}` : `retard de ${text}`;
}

function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const meReq = useApi<Me>("/auth/me/");
  const ticketReq = useApi<Ticket>(`/tickets/${id}/`, 15_000);
  const commentsReq = useApi<Comment[]>(`/tickets/${id}/comments/`, 15_000);
  // Le SLA est un plus : s'il est indisponible, on n'affiche simplement pas le bloc.
  const slaReq = useApi<SlaInfo | null>(`/tickets/${id}/sla/`, 15_000);

  const me = meReq.data;
  const ticket = ticketReq.data;
  const comments = commentsReq.data ?? [];
  const sla = slaReq.data;

  const [content, setContent] = useState("");
  const [actionError, setActionError] = useState("");
  const error = actionError || (ticketReq.error ? "Ticket introuvable ou inaccessible." : "");

  function reloadAll() {
    ticketReq.reload();
    commentsReq.reload();
    slaReq.reload();
  }

  async function resolve() {
    setActionError("");
    try {
      await api(`/tickets/${id}/resolve/`, { method: "POST" });
      reloadAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    setActionError("");
    try {
      await api(`/tickets/${id}/comments/`, {
        method: "POST",
        body: { content },
      });
      setContent("");
      reloadAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur");
    }
  }

  // Seul le technicien assigné (ou un administrateur) peut confirmer la résolution.
  const back =
    me?.role === "ADMIN" ? "/admin/tickets" : me?.role === "TECHNICIAN" ? "/technician/tickets" : "/tickets";
  // Un ticket est un échange entre son auteur et le technicien assigné (l'admin fait exception).
  const canComment =
    !!me &&
    !!ticket &&
    (me.role === "ADMIN" || me.id === ticket.created_by_id || me.id === ticket.assigned_to_id);
  const canResolve =
    !!me &&
    ticket?.status === "IN_PROGRESS" &&
    (me.role === "ADMIN" || ticket.assigned_to_id === me.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href={back} className="text-sm text-blue-600 underline">
        ← Retour aux tickets
      </Link>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {ticket && (
        <>
          <h1 className="mt-4 text-2xl font-semibold">
            #{ticket.id} {ticket.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {CATEGORY_LABEL[ticket.category]} · {PRIORITY_LABEL[ticket.priority]} ·{" "}
            {statusLabel(ticket)} · par {ticket.created_by} · assigné à{" "}
            {ticket.assigned_to ?? "personne pour l'instant"}
          </p>
          <p className="mt-4 whitespace-pre-wrap">{ticket.description}</p>

          {sla && (
            <div
              className={`mt-4 rounded border px-4 py-3 text-sm ${
                sla.breached
                  ? "border-red-500 text-red-600"
                  : "border-green-600 text-green-700"
              }`}
            >
              <p className="font-medium">
                {sla.resolvedAt
                  ? sla.breached
                    ? "Résolu hors délai"
                    : "Résolu dans les délais"
                  : sla.breached
                    ? "Délai dépassé"
                    : "Dans les délais"}
              </p>
              <p>
                Échéance : {new Date(sla.deadline).toLocaleString("fr-FR")}
                {!sla.resolvedAt && ` (${remaining(sla.deadline)})`}
              </p>
            </div>
          )}

          {ticket.status === "OPEN" && ticket.assigned_to_id === null && (
            <p className="mt-4 text-sm text-amber-700">
              Tous les techniciens sont occupés : ce ticket est en file d&apos;attente et sera
              attribué automatiquement au prochain technicien libre.
            </p>
          )}

          {canResolve && (
            <div className="mt-6">
              <button
                onClick={resolve}
                className="rounded bg-green-700 px-4 py-2 text-white"
              >
                Confirmer la résolution
              </button>
            </div>
          )}

          <h2 className="mt-8 mb-3 font-medium">Commentaires</h2>
          <ul className="mb-4 flex flex-col gap-2">
            {comments.length === 0 && (
              <li className="text-sm text-zinc-500">Aucun commentaire.</li>
            )}
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              >
                <p className="text-xs text-zinc-500">
                  {c.author} · {new Date(c.created_at).toLocaleString("fr-FR")}
                </p>
                <p className="whitespace-pre-wrap">{c.content}</p>
              </li>
            ))}
          </ul>
          {canComment && (
          <form onSubmit={addComment} className="flex flex-col gap-2">
            <textarea
              className="w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
              rows={2}
              placeholder="Ajouter un commentaire"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <button className="self-start rounded bg-blue-600 px-4 py-2 text-white">
              Commenter
            </button>
          </form>
          )}
        </>
      )}
    </main>
  );
}

// useParams() lit l'URL au moment de l'affichage : Next.js exige un <Suspense> autour.
export default function TicketDetailPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-zinc-500">Chargement…</p>}>
      <TicketDetail />
    </Suspense>
  );
}
