"use client";

import { AdminUser, ROLE_LABEL } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function UsersPage() {
  const { data, error } = useApi<AdminUser[]>("/admin/users/", 15_000);
  const users = data ?? [];

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Utilisateurs</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded border border-zinc-300 dark:border-zinc-700">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
            <tr>
              <th className="px-3 py-2">Utilisateur</th>
              <th className="px-3 py-2">Rôle</th>
              <th className="px-3 py-2">Disponibilité</th>
              <th className="px-3 py-2">Tickets créés</th>
              <th className="px-3 py-2">Tickets résolus</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
                <td className="px-3 py-2">{u.username}</td>
                <td className="px-3 py-2">{ROLE_LABEL[u.role]}</td>
                <td className="px-3 py-2">
                  {u.role === "TECHNICIAN" ? (u.busy ? "Occupé" : "Disponible") : "–"}
                </td>
                <td className="px-3 py-2">{u.created_count}</td>
                <td className="px-3 py-2">{u.resolved_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
