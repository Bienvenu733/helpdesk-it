package com.helpdesk.sla_service.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.helpdesk.sla_service.model.AuditLog;
import com.helpdesk.sla_service.model.Priority;
import com.helpdesk.sla_service.model.TicketSla;
import com.helpdesk.sla_service.repository.AuditLogRepository;
import com.helpdesk.sla_service.repository.TicketSlaRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

/** Tests de la logique métier, sans base de données : les dépôts sont simulés (Mockito). */
@ExtendWith(MockitoExtension.class)
class SlaServiceTest {

    private static final Instant CREATED = Instant.parse("2026-11-10T08:00:00Z");

    @Mock TicketSlaRepository tickets;
    @Mock AuditLogRepository audit;
    @Mock JdbcTemplate jdbc;

    SlaService service;

    @BeforeEach
    void setUp() {
        service = new SlaService(tickets, audit, jdbc);
    }

    private AuditLog savedAudit() {
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(audit).save(captor.capture());
        return captor.getValue();
    }

    // ---- ticket créé ----------------------------------------------------------------------

    @Test
    void newTicketIsSavedWithItsDeadlineAndAudited() {
        when(tickets.findByTicketId(7L)).thenReturn(Optional.empty());
        when(tickets.save(any(TicketSla.class))).thenAnswer(inv -> inv.getArgument(0));

        TicketSla sla = service.onTicketCreated(7L, Priority.CRITICAL, CREATED);

        assertEquals(CREATED.plus(Duration.ofHours(4)), sla.getDeadline());
        AuditLog log = savedAudit();
        assertEquals("TICKET_CREATED", log.getEventType());
        assertEquals(7L, log.getTicketId());
        assertNotNull(log.getOccurredAt());
    }

    @Test
    void sameCreationEventReceivedTwiceIsIgnored() {
        TicketSla existing = new TicketSla(7L, Priority.LOW, CREATED);
        when(tickets.findByTicketId(7L)).thenReturn(Optional.of(existing));

        TicketSla result = service.onTicketCreated(7L, Priority.CRITICAL, CREATED);

        assertSame(existing, result);                 // le premier enregistrement est conservé
        verify(tickets, never()).save(any());
        verify(audit, never()).save(any());           // et rien n'est audité en double
    }

    // ---- ticket résolu --------------------------------------------------------------------

    @Test
    void resolvingInTimeIsAuditedAsRespected() {
        TicketSla sla = new TicketSla(7L, Priority.HIGH, Instant.now());
        when(tickets.findByTicketId(7L)).thenReturn(Optional.of(sla));

        service.onTicketResolved(7L, Instant.now());

        assertEquals("TICKET_RESOLVED", savedAudit().getEventType());
        assertEquals("délai respecté", savedAudit().getDetails());
    }

    @Test
    void resolvingLateIsAuditedAsBreached() {
        TicketSla sla = new TicketSla(7L, Priority.HIGH, Instant.now().minus(Duration.ofHours(20)));
        when(tickets.findByTicketId(7L)).thenReturn(Optional.of(sla));

        service.onTicketResolved(7L, Instant.now());

        assertEquals("délai NON respecté", savedAudit().getDetails());
    }

    @Test
    void resolutionDateIsRecorded() {
        TicketSla sla = new TicketSla(7L, Priority.LOW, CREATED);
        when(tickets.findByTicketId(7L)).thenReturn(Optional.of(sla));
        Instant at = CREATED.plus(Duration.ofHours(2));

        service.onTicketResolved(7L, at);

        assertEquals(at, sla.getResolvedAt());
    }

    @Test
    void resolvingAnAlreadyResolvedTicketChangesNothing() {
        TicketSla sla = new TicketSla(7L, Priority.LOW, CREATED);
        Instant first = CREATED.plus(Duration.ofHours(1));
        sla.setResolvedAt(first);
        when(tickets.findByTicketId(7L)).thenReturn(Optional.of(sla));

        service.onTicketResolved(7L, CREATED.plus(Duration.ofHours(5)));

        assertEquals(first, sla.getResolvedAt());
        verify(audit, never()).save(any());
    }

    @Test
    void resolvingAnUnknownTicketIsA404() {
        when(tickets.findByTicketId(99L)).thenReturn(Optional.empty());

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> service.onTicketResolved(99L, CREATED));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatusCode());
    }

    @Test
    void findingAnUnknownTicketIsA404() {
        when(tickets.findByTicketId(99L)).thenReturn(Optional.empty());
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> service.findByTicketId(99L));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatusCode());
    }

    // ---- lecture --------------------------------------------------------------------------

    @Test
    void overdueAsksTheRepositoryForOpenTicketsPastTheirDeadline() {
        TicketSla late = new TicketSla(1L, Priority.LOW, CREATED);
        when(tickets.findByResolvedAtIsNullAndDeadlineBefore(any(Instant.class))).thenReturn(List.of(late));

        assertEquals(List.of(late), service.overdue());
    }

    @Test
    void complianceRateIsComputedByTheOraclePlSqlFunction() {
        when(jdbc.queryForObject(anyString(), eq(Double.class), any())).thenReturn(87.5);

        assertEquals(87.5, service.complianceRate(Priority.HIGH));

        verify(jdbc).queryForObject(contains("sla_compliance_rate"), eq(Double.class), eq("HIGH"));
    }

    @Test
    void auditForATicketComesFromTheRepository() {
        AuditLog log = new AuditLog("TICKET_CREATED", 7L, "x");
        when(audit.findByTicketIdOrderByOccurredAtAsc(7L)).thenReturn(List.of(log));
        assertEquals(List.of(log), service.auditFor(7L));
    }
}
