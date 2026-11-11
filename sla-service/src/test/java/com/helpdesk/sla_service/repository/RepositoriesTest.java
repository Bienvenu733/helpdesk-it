package com.helpdesk.sla_service.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.helpdesk.sla_service.model.AuditLog;
import com.helpdesk.sla_service.model.Priority;
import com.helpdesk.sla_service.model.TicketSla;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

/** Vraies requêtes SQL, sur une base H2 en mémoire créée pour le test. */
@DataJpaTest(showSql = false)
class RepositoriesTest {

    @Autowired TicketSlaRepository tickets;
    @Autowired AuditLogRepository audit;

    private static final Instant NOW = Instant.now();

    @Test
    void ticketIsFoundByItsDjangoId() {
        tickets.saveAndFlush(new TicketSla(42L, Priority.HIGH, NOW));

        assertTrue(tickets.findByTicketId(42L).isPresent());
        assertTrue(tickets.findByTicketId(43L).isEmpty());
    }

    @Test
    void twoRecordsForTheSameTicketAreRejectedByTheDatabase() {
        tickets.saveAndFlush(new TicketSla(42L, Priority.HIGH, NOW));

        assertThrows(DataIntegrityViolationException.class,
                () -> tickets.saveAndFlush(new TicketSla(42L, Priority.LOW, NOW)));
    }

    @Test
    void overdueQueryKeepsOnlyOpenTicketsPastTheirDeadline() {
        // en retard et ouvert
        tickets.save(new TicketSla(1L, Priority.CRITICAL, NOW.minus(Duration.ofHours(6))));
        // ouvert mais dans les délais
        tickets.save(new TicketSla(2L, Priority.LOW, NOW));
        // échéance dépassée mais déjà résolu : n'est plus « en retard à traiter »
        TicketSla resolved = new TicketSla(3L, Priority.CRITICAL, NOW.minus(Duration.ofHours(10)));
        resolved.setResolvedAt(NOW.minus(Duration.ofHours(1)));
        tickets.save(resolved);
        tickets.flush();

        List<TicketSla> overdue = tickets.findByResolvedAtIsNullAndDeadlineBefore(NOW);

        assertEquals(List.of(1L), overdue.stream().map(TicketSla::getTicketId).toList());
    }

    @Test
    void openTicketsAreCounted() {
        tickets.save(new TicketSla(1L, Priority.LOW, NOW));
        tickets.save(new TicketSla(2L, Priority.LOW, NOW));
        TicketSla done = new TicketSla(3L, Priority.LOW, NOW);
        done.setResolvedAt(NOW);
        tickets.save(done);
        tickets.flush();

        assertEquals(2, tickets.countByResolvedAtIsNull());
    }

    @Test
    void priorityIsStoredAsReadableText() {
        TicketSla saved = tickets.saveAndFlush(new TicketSla(1L, Priority.MEDIUM, NOW));

        assertEquals(Priority.MEDIUM, tickets.findById(saved.getId()).orElseThrow().getPriority());
    }

    @Test
    void auditOfATicketIsReturnedOldestFirst() throws InterruptedException {
        audit.saveAndFlush(new AuditLog("TICKET_CREATED", 7L, "a"));
        Thread.sleep(5);
        audit.saveAndFlush(new AuditLog("TICKET_RESOLVED", 7L, "b"));
        audit.saveAndFlush(new AuditLog("TICKET_CREATED", 8L, "autre ticket"));

        List<AuditLog> logs = audit.findByTicketIdOrderByOccurredAtAsc(7L);

        assertEquals(List.of("TICKET_CREATED", "TICKET_RESOLVED"),
                logs.stream().map(AuditLog::getEventType).toList());
    }

    @Test
    void recentAuditIsCappedAtOneHundredEntries() {
        for (int i = 0; i < 105; i++) {
            audit.save(new AuditLog("TICKET_CREATED", (long) i, "x"));
        }
        audit.flush();

        assertEquals(100, audit.findTop100ByOrderByOccurredAtDesc().size());
    }
}
