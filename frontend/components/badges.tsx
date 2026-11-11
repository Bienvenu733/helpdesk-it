"use client";

import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, Ticket } from "@/lib/api";
import { Badge, Tone } from "./ui";

const PRIORITY_TONE: Record<Ticket["priority"], Tone> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "neutral",
};

export function PriorityBadge({ priority }: { priority: Ticket["priority"] }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}

export function StatusBadge({ ticket }: { ticket: Pick<Ticket, "status" | "assigned_to_id"> }) {
  if (ticket.status === "OPEN" && ticket.assigned_to_id === null) {
    return <Badge tone="warning">En attente</Badge>;
  }
  const tone: Record<Ticket["status"], Tone> = {
    OPEN: "warning",
    IN_PROGRESS: "primary",
    RESOLVED: "success",
    CLOSED: "neutral",
  };
  return <Badge tone={tone[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>;
}

export function CategoryBadge({ category }: { category: Ticket["category"] }) {
  return <Badge tone="neutral">{CATEGORY_LABEL[category]}</Badge>;
}
