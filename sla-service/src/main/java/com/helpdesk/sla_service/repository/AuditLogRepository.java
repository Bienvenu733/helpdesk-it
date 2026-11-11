package com.helpdesk.sla_service.repository;

import com.helpdesk.sla_service.model.AuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByTicketIdOrderByOccurredAtAsc(Long ticketId);

    List<AuditLog> findTop100ByOrderByOccurredAtDesc();
}
