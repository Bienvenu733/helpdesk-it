// Couche d'accès à l'API Django : tout le code réseau est ici.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export type Role = "USER" | "TECHNICIAN" | "ADMIN";

export type Me = { id: number; username: string; role: Role };

export type Ticket = {
  id: number;
  title: string;
  description: string;
  category: "HARDWARE" | "NETWORK" | "SOFTWARE" | "ACCESS" | "OTHER";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  created_by: string;
  created_by_id: number;
  assigned_to: string | null;
  assigned_to_id: number | null;
  created_at: string;
  resolved_at: string | null;
};

export type SlaInfo = {
  ticketId: number;
  priority: Ticket["priority"];
  createdAt: string;
  deadline: string;
  resolvedAt: string | null;
  breached: boolean;
};

export type SlaStats = {
  open: number;
  overdue: number;
  complianceRate: number | null;
};

export type AdminUser = {
  id: number;
  username: string;
  role: Role;
  created_count: number;
  resolved_count: number;
  busy: boolean;
  current_tickets: { id: number; title: string; priority: Ticket["priority"] }[];
};

export type ActivityEvent = {
  id: number;
  actor: string;
  actor_role: Role;
  event_type: "CREATED" | "ASSIGNED" | "RESOLVED" | "COMMENTED";
  ticket_id: number;
  ticket_title: string;
  created_at: string;
};

export const ROLE_LABEL = {
  USER: "Utilisateur",
  TECHNICIAN: "Technicien",
  ADMIN: "Administrateur",
} as const;

export const EVENT_LABEL = {
  CREATED: "a créé le ticket",
  ASSIGNED: "a été assigné au ticket",
  RESOLVED: "a résolu le ticket",
  COMMENTED: "a commenté le ticket",
} as const;

export type NotificationItem = {
  id: number;
  message: string;
  ticket_id: number;
  is_read: boolean;
  created_at: string;
};

export type NotificationsResponse = {
  unread_count: number;
  results: NotificationItem[];
};

export type TechStats = {
  busy: boolean;
  current_ticket: {
    id: number;
    title: string;
    description: string;
    priority: Ticket["priority"];
    category: Ticket["category"];
    created_at: string;
  } | null;
  resolved_total: number;
  resolved_today: number;
  avg_resolution_hours: number | null;
  waiting_count: number;
  per_day: { date: string; created: number; resolved: number }[];
};

// Page d'accueil de chaque rôle après la connexion.
export function homeFor(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "TECHNICIAN") return "/technician";
  return "/tickets";
}

export type Breakdown = { key: string; label: string; count: number }[];

export type AdminStats = {
  totals: {
    total: number;
    waiting: number;
    in_progress: number;
    resolved: number;
    technicians: number;
    technicians_busy: number;
  };
  by_priority: Breakdown;
  by_status: Breakdown;
  by_category: Breakdown;
  per_day: { date: string; created: number; resolved: number }[];
  avg_resolution_hours: number | null;
  sla: SlaStats | null;
};

export const CATEGORY_LABEL = {
  HARDWARE: "Matériel",
  NETWORK: "Réseau",
  SOFTWARE: "Logiciel",
  ACCESS: "Compte et accès",
  OTHER: "Autre",
} as const;

// Un ticket ouvert et sans technicien est « en attente » (file d'attente).
export function statusLabel(t: Pick<Ticket, "status" | "assigned_to_id">) {
  if (t.status === "OPEN" && t.assigned_to_id === null) return "En attente";
  return STATUS_LABEL[t.status];
}

export type Comment = {
  id: number;
  author: string;
  content: string;
  created_at: string;
};

// Les jetons sont gardés dans sessionStorage : propre à CHAQUE onglet. Avec sessionStorage
// (partagé entre onglets), se connecter avec un autre compte dans un second onglet
// changeait aussi l'identité du premier, qui affichait alors les données d'un autre
// utilisateur. Inconvénient : fermer l'onglet déconnecte.
// En production, on préférerait des cookies httpOnly.
const ACCESS = "access";
const REFRESH = "refresh";

export function saveTokens(access: string, refresh: string) {
  sessionStorage.setItem(ACCESS, access);
  sessionStorage.setItem(REFRESH, refresh);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS);
  sessionStorage.removeItem(REFRESH);
}

export function hasToken() {
  return typeof window !== "undefined" && !!sessionStorage.getItem(ACCESS);
}

async function refreshAccess(): Promise<boolean> {
  const refresh = sessionStorage.getItem(REFRESH);
  if (!refresh) return false;
  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  sessionStorage.setItem(ACCESS, data.access);
  return true;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Envoie une requête avec le jeton. Si le jeton a expiré (401),
// on en demande un nouveau avec le refresh token puis on réessaie une fois.
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const send = () =>
    fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem(ACCESS) ?? ""}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

  let res = await send();
  if (res.status === 401 && (await refreshAccess())) {
    res = await send();
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail ?? "Erreur " + res.status);
  }
  return res.json();
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new ApiError(res.status, "Identifiants incorrects");
  const data = await res.json();
  saveTokens(data.access, data.refresh);
}

export async function register(
  username: string,
  email: string,
  password: string,
) {
  const res = await fetch(`${API_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const first = Object.values(data)[0];
    throw new ApiError(
      res.status,
      Array.isArray(first) ? String(first[0]) : "Inscription impossible",
    );
  }
}

export const PRIORITY_LABEL = {
  CRITICAL: "Critique",
  HIGH: "Haute",
  MEDIUM: "Moyenne",
  LOW: "Basse",
} as const;

export const STATUS_LABEL = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  CLOSED: "Clôturé",
} as const;
