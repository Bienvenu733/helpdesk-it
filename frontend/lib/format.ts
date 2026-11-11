/** « il y a 5 min », « il y a 3 h », « hier », puis la date. */
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return shortDate(iso);
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Durée restante (ou retard) avant une échéance. */
export function remaining(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const text = hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
  return ms >= 0 ? `il reste ${text}` : `retard de ${text}`;
}
