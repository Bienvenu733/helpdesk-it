"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { NotificationBanner } from "@/components/notifications";
import {
  api,
  CATEGORY_LABEL,
  clearTokens,
  homeFor,
  Me,
  NotificationsResponse,
  PRIORITY_LABEL,
  statusLabel,
  Ticket,
} from "@/lib/api";
import { useApi } from "@/lib/hooks";

// Espace de l'utilisateur : signaler un incident et suivre ses tickets.
export default function TicketsPage() {
  const router = useRouter();
  const me = useApi<Me>("/auth/me/");
  const tickets = useApi<Ticket[]>("/tickets/", 10_000);
  const notifs = useApi<NotificationsResponse>("/notifications/", 8_000);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [category, setCategory] = useState("OTHER");
  const [error, setError] = useState("");

  // Un technicien a son propre espace.
  useEffect(() => {
    if (me.data?.role === "TECHNICIAN") router.replace("/technician");
  }, [me.data, router]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/tickets/", {
        method: "POST",
        body: { title, description, priority, category },
      });
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setCategory("OTHER");
      tickets.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function markRead(id: number) {
    await api(`/notifications/${id}/read/`, { method: "POST" });
    notifs.reload();
  }

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  const unread = notifs.data?.unread_count ?? 0;
  const input =
    "w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes tickets</h1>
        <div className="flex items-center gap-3 text-sm">
          {me.data && (
            <span className="text-zinc-500">
              {me.data.username} · {me.data.role}
            </span>
          )}
          {me.data && me.data.role !== "USER" && (
            <Link href={homeFor(me.data.role)} className="text-blue-600 underline">
              Mon espace
            </Link>
          )}
          <Link href="/notifications" className="text-blue-600 underline">
            Notifications
            {unread > 0 && (
              <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">
                {unread}
              </span>
            )}
          </Link>
          <button onClick={logout} className="text-blue-600 underline">
            Déconnexion
          </button>
        </div>
      </header>

      <NotificationBanner
        latest={notifs.data?.results.find((n) => !n.is_read)}
        onRead={markRead}
      />

      {(error || tickets.error) && (
        <p className="mb-4 text-sm text-red-600">{error || tickets.error}</p>
      )}

      <form
        onSubmit={onCreate}
        className="mb-8 flex flex-col gap-3 rounded border border-zinc-300 p-4 dark:border-zinc-700"
      >
        <h2 className="font-medium">Signaler un incident</h2>
        <input
          className={input}
          placeholder="Titre (ex. Mon PC ne démarre pas)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className={input}
          placeholder="Description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <select
          className={input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Type de panne"
        >
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k} className="text-black">
              {v}
            </option>
          ))}
        </select>
        <select
          className={input}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Priorité"
        >
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k} className="text-black">
              {v}
            </option>
          ))}
        </select>
        <button className="self-start rounded bg-blue-600 px-4 py-2 text-white">
          Créer le ticket
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {(tickets.data ?? []).length === 0 && !tickets.error && (
          <li className="text-sm text-zinc-500">Aucun ticket.</li>
        )}
        {(tickets.data ?? []).map((t) => (
          <li key={t.id}>
            <Link
              href={`/tickets/${t.id}`}
              className="flex items-center justify-between rounded border border-zinc-300 px-4 py-3 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <span>
                <span className="text-zinc-500">#{t.id}</span> {t.title}
              </span>
              <span className="text-xs text-zinc-500">
                {CATEGORY_LABEL[t.category]} · {PRIORITY_LABEL[t.priority]} · {statusLabel(t)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
