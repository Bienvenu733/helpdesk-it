package com.helpdesk.sla_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Piste d'audit : trace de chaque événement reçu. Jamais modifiée, jamais supprimée. */
@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String eventType;

    @Column(nullable = false)
    private Long ticketId;

    @Column(length = 500)
    private String details;

    @Column(nullable = false)
    private Instant occurredAt;

    protected AuditLog() {
        // requis par JPA
    }

    public AuditLog(String eventType, Long ticketId, String details) {
        this.eventType = eventType;
        this.ticketId = ticketId;
        this.details = details;
        this.occurredAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getEventType() { return eventType; }
    public Long getTicketId() { return ticketId; }
    public String getDetails() { return details; }
    public Instant getOccurredAt() { return occurredAt; }
}
