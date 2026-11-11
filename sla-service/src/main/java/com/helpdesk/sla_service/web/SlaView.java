package com.helpdesk.sla_service.web;

import com.helpdesk.sla_service.model.Priority;
import com.helpdesk.sla_service.model.TicketSla;
import java.time.Instant;

/** Ce que l'API renvoie : on n'expose pas directement l'entité JPA. */
public record SlaView(
        Long ticketId,
        Priority priority,
        Instant createdAt,
        Instant deadline,
        Instant resolvedAt,
        boolean breached) {

    public static SlaView from(TicketSla sla) {
        return new SlaView(
                sla.getTicketId(),
                sla.getPriority(),
                sla.getCreatedAt(),
                sla.getDeadline(),
                sla.getResolvedAt(),
                sla.isBreached(Instant.now()));
    }
}
