package com.helpdesk.sla_service.repository;

import com.helpdesk.sla_service.model.TicketSla;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketSlaRepository extends JpaRepository<TicketSla, Long> {

    Optional<TicketSla> findByTicketId(Long ticketId);

    /** Tickets non résolus dont l'échéance est passée. Spring génère le SQL à partir du nom. */
    List<TicketSla> findByResolvedAtIsNullAndDeadlineBefore(Instant now);

    long countByResolvedAtIsNull();
}
