package com.helpdesk.sla_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Suivi du délai de résolution d'un ticket du service Django. */
@Entity
@Table(name = "ticket_sla")
public class TicketSla {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identifiant du ticket côté Django. */
    @Column(nullable = false, unique = true)
    private Long ticketId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Priority priority;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant deadline;

    private Instant resolvedAt;

    protected TicketSla() {
        // requis par JPA
    }

    public TicketSla(Long ticketId, Priority priority, Instant createdAt) {
        this.ticketId = ticketId;
        this.priority = priority;
        this.createdAt = createdAt;
        this.deadline = createdAt.plus(priority.slaDuration());
    }

    public boolean isResolved() {
        return resolvedAt != null;
    }

    /** Vrai si le délai est dépassé (résolu en retard, ou toujours ouvert après l'échéance). */
    public boolean isBreached(Instant now) {
        Instant reference = isResolved() ? resolvedAt : now;
        return reference.isAfter(deadline);
    }

    public Long getId() { return id; }
    public Long getTicketId() { return ticketId; }
    public Priority getPriority() { return priority; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDeadline() { return deadline; }
    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
}
