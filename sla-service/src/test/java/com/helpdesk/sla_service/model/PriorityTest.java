package com.helpdesk.sla_service.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class PriorityTest {

    @ParameterizedTest
    @CsvSource({"CRITICAL,4", "HIGH,8", "MEDIUM,24", "LOW,72"})
    void eachPriorityHasItsSlaDuration(Priority priority, long hours) {
        assertEquals(Duration.ofHours(hours), priority.slaDuration());
    }

    @Test
    void moreUrgentMeansShorterDeadline() {
        assertTrue(Priority.CRITICAL.slaDuration().compareTo(Priority.HIGH.slaDuration()) < 0);
        assertTrue(Priority.HIGH.slaDuration().compareTo(Priority.MEDIUM.slaDuration()) < 0);
        assertTrue(Priority.MEDIUM.slaDuration().compareTo(Priority.LOW.slaDuration()) < 0);
    }
}
