package com.helpdesk.sla_service.service;

import com.helpdesk.sla_service.model.AuditLog;
import com.helpdesk.sla_service.model.Priority;
import com.helpdesk.sla_service.model.TicketSla;
import com.helpdesk.sla_service.repository.AuditLogRepository;
import com.helpdesk.sla_service.repository.TicketSlaRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Logique métier du suivi des délais de résolution. */
@Service
public class SlaService {

    private final TicketSlaRepository tickets;
    private final AuditLogRepository audit;
    private final JdbcTemplate jdbc;

    public SlaService(TicketSlaRepository tickets, AuditLogRepository audit, JdbcTemplate jdbc) {
        this.tickets = tickets;
        this.audit = audit;
        this.jdbc = jdbc;
    }

    /** Enregistre un nouveau ticket. Si l'événement est reçu deux fois, on garde le premier. */
    @Transactional
    public TicketSla onTicketCreated(Long ticketId, Priority priority, Instant createdAt) {
        return tickets.findByTicketId(ticketId).orElseGet(() -> {
            TicketSla sla = tickets.save(new TicketSla(ticketId, priority, createdAt));
            audit.save(new AuditLog("TICKET_CREATED", ticketId,
                    "priorité=" + priority + ", échéance=" + sla.getDeadline()));
            return sla;
        });
    }

    @Transactional
    public TicketSla onTicketResolved(Long ticketId, Instant resolvedAt) {
        TicketSla sla = tickets.findByTicketId(ticketId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket inconnu : " + ticketId));
        if (sla.isResolved()) {
            return sla;
        }
        sla.setResolvedAt(resolvedAt);
        audit.save(new AuditLog("TICKET_RESOLVED", ticketId,
                sla.isBreached(Instant.now()) ? "délai NON respecté" : "délai respecté"));
        return sla;
    }

    @Transactional(readOnly = true)
    public TicketSla findByTicketId(Long ticketId) {
        return tickets.findByTicketId(ticketId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket inconnu : " + ticketId));
    }

    @Transactional(readOnly = true)
    public List<TicketSla> overdue() {
        return tickets.findByResolvedAtIsNullAndDeadlineBefore(Instant.now());
    }

    @Transactional(readOnly = true)
    public List<TicketSla> all() {
        return tickets.findAll();
    }

    /** Taux de respect du SLA, calculé par la fonction PL/SQL stockée dans Oracle. */
    @Transactional(readOnly = true)
    public Double complianceRate(Priority priority) {
        return jdbc.queryForObject(
                "SELECT sla_compliance_rate(?) FROM dual",
                Double.class,
                priority == null ? null : priority.name());
    }

    @Transactional(readOnly = true)
    public long openCount() {
        return tickets.countByResolvedAtIsNull();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditFor(Long ticketId) {
        return audit.findByTicketIdOrderByOccurredAtAsc(ticketId);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> recentAudit() {
        return audit.findTop100ByOrderByOccurredAtDesc();
    }
}
