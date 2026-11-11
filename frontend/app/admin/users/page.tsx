"use client";

import { Avatar, Badge, Card, ErrorNote, Reveal, td, th, tableHead, tableRow, tableWrap, Tone } from "@/components/ui";
import { AdminUser, ROLE_LABEL } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { matchesQuery, useSearch } from "@/lib/search";

const ROLE_TONE: Record<AdminUser["role"], Tone> = { ADMIN: "primary", TECHNICIAN: "violet", USER: "neutral" };

export default function UsersPage() {
  const { data, error } = useApi<AdminUser[]>("/admin/users/", 15_000);
  const { query } = useSearch();
  const users = (data ?? []).filter((u) => matchesQuery(query, [u.username, ROLE_LABEL[u.role]]));

  return (
    <Reveal>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card title={`${users.length} utilisateur${users.length > 1 ? "s" : ""}`} bodyClassName="pt-4">
        <div className={tableWrap}>
          <table className="w-full">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Utilisateur</th>
                <th className={th}>Rôle</th>
                <th className={th}>Disponibilité</th>
                <th className={`${th} text-right`}>Tickets créés</th>
                <th className={`${th} text-right`}>Tickets résolus</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={tableRow}>
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <Avatar name={u.username} size="sm" />
                      <span className="font-medium">{u.username}</span>
                    </span>
                  </td>
                  <td className={td}>
                    <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className={td}>
                    {u.role === "TECHNICIAN" ? (
                      <Badge tone={u.busy ? "warning" : "success"}>{u.busy ? "Occupé" : "Disponible"}</Badge>
                    ) : (
                      <span className="text-ink-2">–</span>
                    )}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{u.created_count}</td>
                  <td className={`${td} text-right tabular-nums`}>{u.resolved_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Reveal>
  );
}
