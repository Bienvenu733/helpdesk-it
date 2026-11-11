"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/badges";
import { Avatar, Button, Card, ErrorNote, field, Reveal } from "@/components/ui";
import { api, Comment, Me, SlaInfo, Ticket } from "@/lib/api";
import { fullDateTime, remaining, timeAgo } from "@/lib/format";
import { useApi } from "@/lib/hooks";

/** « awa (Utilisateur) » -> { name: "awa", role: "Utilisateur" } */
function person(value: string | null) {
  if (!value) return null;
  const m = value.match(/^(.*) \((.*)\)$/);
  return m ? { name: m[1], role: m[2] } : { name: value, role: "" };
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
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
  const [sending, setSending] = useState(false);
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
    setSending(true);
    try {
      await api(`/tickets/${id}/comments/`, { method: "POST", body: { content } });
      setContent("");
      reloadAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  const back =
    me?.role === "ADMIN" ? "/admin/tickets" : me?.role === "TECHNICIAN" ? "/technician/tickets" : "/tickets";

  // Un ticket est un échange entre son auteur et le technicien assigné (l'admin fait exception).
  const canComment =
    !!me && !!ticket && (me.role === "ADMIN" || me.id === ticket.created_by_id || me.id === ticket.assigned_to_id);
  // Seul le technicien assigné (ou un administrateur) peut confirmer la résolution.
  const canResolve =
    !!me && ticket?.status === "IN_PROGRESS" && (me.role === "ADMIN" || ticket.assigned_to_id === me.id);

  const author = person(ticket?.created_by ?? null);
  const tech = person(ticket?.assigned_to ?? null);

  return (
    <div className="space-y-4">
      <Link href={back} className="inline-flex items-center gap-2 text-sm font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Retour aux tickets
      </Link>

      {error && <ErrorNote>{error}</ErrorNote>}

      {ticket && (
        <Reveal className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Card>
              <p className="text-sm text-ink-2">Ticket #{ticket.id}</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">{ticket.title}</h2>
              <p className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge ticket={ticket} />
                <PriorityBadge priority={ticket.priority} />
                <CategoryBadge category={ticket.category} />
              </p>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink">{ticket.description}</p>

              {sla && (
                <div
                  className={`mt-5 flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
                    sla.breached ? "bg-danger-soft text-danger-ink" : "bg-success-soft text-success-ink"
                  }`}
                >
                  {sla.breached ? (
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                  ) : sla.resolvedAt ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
                  ) : (
                    <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
                  )}
                  <div>
                    <p className="font-semibold">
                      {sla.resolvedAt
                        ? sla.breached
                          ? "Résolu hors délai"
                          : "Résolu dans les délais"
                        : sla.breached
                          ? "Délai dépassé"
                          : "Dans les délais"}
                    </p>
                    <p>
                      Échéance : {fullDateTime(sla.deadline)}
                      {!sla.resolvedAt && ` (${remaining(sla.deadline)})`}
                    </p>
                  </div>
                </div>
              )}

              {ticket.status === "OPEN" && ticket.assigned_to_id === null && (
                <p className="mt-5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-ink">
                  Tous les techniciens sont occupés : ce ticket est en file d&apos;attente et sera attribué automatiquement
                  au prochain technicien libre.
                </p>
              )}

              {canResolve && (
                <div className="mt-5">
                  <Button variant="success" onClick={resolve}>
                    <CheckCircle2 className="size-4" aria-hidden />
                    Confirmer la résolution
                  </Button>
                </div>
              )}
            </Card>

            <Card title={`Conversation (${comments.length})`}>
              {comments.length === 0 ? (
                <p className="text-sm text-ink-2">Aucun message pour l&apos;instant.</p>
              ) : (
                <ul className="space-y-5">
                  {comments.map((c) => {
                    const p = person(c.author);
                    return (
                      <li key={c.id} className="flex gap-3">
                        <Avatar name={p?.name ?? "?"} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-semibold text-ink">{p?.name}</span>
                            {p?.role && <span className="text-ink-2"> · {p.role}</span>}
                            <span className="text-xs text-ink-2"> · {timeAgo(c.created_at)}</span>
                          </p>
                          <p className="mt-1 whitespace-pre-wrap rounded-xl rounded-tl-sm bg-surface-2 px-4 py-2.5 text-sm text-ink">
                            {c.content}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {canComment && (
                <form onSubmit={addComment} className="mt-6 flex flex-col gap-3 border-t border-line pt-5">
                  <label htmlFor="comment" className="sr-only">
                    Votre message
                  </label>
                  <textarea
                    id="comment"
                    className={field}
                    rows={3}
                    placeholder="Écrire un message…"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                  <Button type="submit" disabled={sending} className="self-end">
                    <Send className="size-4" aria-hidden />
                    Envoyer
                  </Button>
                </form>
              )}
            </Card>
          </div>

          <Card title="Détails" className="self-start">
            <dl className="divide-y divide-line">
              <Detail label="Auteur">
                {author && (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={author.name} size="sm" /> {author.name}
                  </span>
                )}
              </Detail>
              <Detail label="Technicien">
                {tech ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={tech.name} size="sm" /> {tech.name}
                  </span>
                ) : (
                  <span className="font-normal text-ink-2">Pas encore assigné</span>
                )}
              </Detail>
              <Detail label="Catégorie">
                <CategoryBadge category={ticket.category} />
              </Detail>
              <Detail label="Priorité">
                <PriorityBadge priority={ticket.priority} />
              </Detail>
              <Detail label="Statut">
                <StatusBadge ticket={ticket} />
              </Detail>
              <Detail label="Créé le">{fullDateTime(ticket.created_at)}</Detail>
              <Detail label="Résolu le">{ticket.resolved_at ? fullDateTime(ticket.resolved_at) : "–"}</Detail>
            </dl>
          </Card>
        </Reveal>
      )}
    </div>
  );
}

// useParams() et usePathname() lisent l'URL au moment de l'affichage : sur une route dynamique,
// Next.js exige un <Suspense> autour de TOUT ce qui les utilise (la page ET la coquille).
export default function TicketDetailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-ink-2">Chargement…</div>}>
      <AppShell>
        <TicketDetail />
      </AppShell>
    </Suspense>
  );
}
