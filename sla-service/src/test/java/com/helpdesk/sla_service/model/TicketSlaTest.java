package com.helpdesk.sla_service.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class TicketSlaTest {

    private static final Instant CREATED = Instant.parse("2026-11-10T08:00:00Z");

    private static TicketSla high() {
        return new TicketSla(42L, Priority.HIGH, CREATED); // échéance : 16:00
    }

    @ParameterizedTest
    @EnumSource(Priority.class)
    void deadlineIsCreationPlusSlaDuration(Priority priority) {
        TicketSla sla = new TicketSla(1L, priority, CREATED);
        assertEquals(CREATED.plus(priority.slaDuration()), sla.getDeadline());
    }

    @Test
    void newTicketIsNotResolved() {
        assertFalse(high().isResolved());
    }

    @Test
    void settingTheResolutionDateMarksItResolved() {
        TicketSla sla = high();
        sla.setResolvedAt(CREATED.plus(Duration.ofHours(1)));
        assertTrue(sla.isResolved());
    }

    @Test
    void openTicketBeforeDeadlineIsNotBreached() {
        assertFalse(high().isBreached(CREATED.plus(Duration.ofHours(7))));
    }

    @Test
    void openTicketAfterDeadlineIsBreached() {
        assertTrue(high().isBreached(CREATED.plus(Duration.ofHours(9))));
    }

    @Test
    void ticketResolvedInTimeIsNotBreachedEvenLongAfter() {
        TicketSla sla = high();
        sla.setResolvedAt(CREATED.plus(Duration.ofHours(3)));
        // Le « maintenant » n'a plus d'importance une fois le ticket résolu.
        assertFalse(sla.isBreached(CREATED.plus(Duration.ofDays(30))));
    }

    @Test
    void ticketResolvedLateIsBreached() {
        TicketSla sla = high();
        sla.setResolvedAt(CREATED.plus(Duration.ofHours(9)));
        assertTrue(sla.isBreached(CREATED.plus(Duration.ofHours(10))));
    }

    @Test
    void resolvingExactlyAtTheDeadlineIsStillInTime() {
        TicketSla sla = high();
        sla.setResolvedAt(sla.getDeadline());
        assertFalse(sla.isBreached(Instant.now()));
    }
}
