package com.helpdesk.sla_service.model;

import java.time.Duration;

/** Priorité d'un ticket et délai de résolution (SLA) associé. */
public enum Priority {
    CRITICAL(4),
    HIGH(8),
    MEDIUM(24),
    LOW(72);

    private final Duration slaDuration;

    Priority(int hours) {
        this.slaDuration = Duration.ofHours(hours);
    }

    public Duration slaDuration() {
        return slaDuration;
    }
}
