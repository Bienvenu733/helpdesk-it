"use client";

import { Activity, CircleCheck, Send, Ticket as TicketIcon } from "lucide-react";
import { FormEvent, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TicketsTable } from "@/components/tickets-table";
import { Button, Card, ErrorNote, field, Reveal, StatCard } from "@/components/ui";
import { api, CATEGORY_LABEL, PRIORITY_LABEL, Ticket } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { matchesQuery, useSearch } from "@/lib/search";

function UserTickets() {
  const tickets = useApi<Ticket[]>("/tickets/", 10_000);
  const { query } = useSearch();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [category, setCategory] = useState("OTHER");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await api("/tickets/", { method: "POST", body: { title, description, priority, category } });
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setCategory("OTHER");
      tickets.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  const all = tickets.data ?? [];
  const shown = all.filter((t) => matchesQuery(query, [t.id, t.title, t.assigned_to, CATEGORY_LABEL[t.category]]));
  const label = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <div className="space-y-6">
      {(error || tickets.error) && <ErrorNote>{error || tickets.error}</ErrorNote>}

      <Reveal delay={0.15}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={TicketIcon} tone="info" label="Mes tickets" value={all.length} />
          <StatCard
            icon={Activity}
            tone="primary"
            label="En cours de traitement"
            value={all.filter((t) => t.status !== "RESOLVED").length}
          />
          <StatCard icon={CircleCheck} tone="success" label="Résolus" value={all.filter((t) => t.status === "RESOLVED").length} />
        </div>
      </Reveal>

      <Reveal delay={0.25}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card title="Signaler un incident" className="xl:col-span-1">
            <form onSubmit={onCreate} className="flex flex-col gap-4">
              <div>
                <label htmlFor="title" className={label}>
                  Titre
                </label>
                <input
                  id="title"
                  className={field}
                  placeholder="Ex. Mon PC ne démarre pas"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className={label}>
                  Description
                </label>
                <textarea
                  id="description"
                  className={field}
                  rows={4}
                  placeholder="Que se passe-t-il ? Depuis quand ?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="category" className={label}>
                    Type de panne
                  </label>
                  <select id="category" className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="priority" className={label}>
                    Priorité
                  </label>
                  <select id="priority" className={field} value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={sending}>
                <Send className="size-4" aria-hidden />
                {sending ? "Envoi…" : "Créer le ticket"}
              </Button>
            </form>
          </Card>

          <Card title="Mes tickets" className="xl:col-span-2" bodyClassName="pt-4">
            <TicketsTable tickets={shown} showTech compact emptyText="Aucun ticket pour l'instant : signalez votre premier incident." />
          </Card>
        </div>
      </Reveal>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <AppShell allow={["USER"]}>
      <UserTickets />
    </AppShell>
  );
}
