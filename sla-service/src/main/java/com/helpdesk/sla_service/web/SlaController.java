package com.helpdesk.sla_service.web;

import com.helpdesk.sla_service.model.AuditLog;
import com.helpdesk.sla_service.model.Priority;
import com.helpdesk.sla_service.service.SlaService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Consultation : suivi des délais, retards, statistiques, audit. */
@RestController
@RequestMapping("/api")
public class SlaController {

    public record Stats(long open, long overdue, Double complianceRate) {}

    private final SlaService service;

    public SlaController(SlaService service) {
        this.service = service;
    }

    @GetMapping("/sla/tickets")
    public List<SlaView> all() {
        return service.all().stream().map(SlaView::from).toList();
    }

    @GetMapping("/sla/tickets/{ticketId}")
    public SlaView one(@PathVariable Long ticketId) {
        return SlaView.from(service.findByTicketId(ticketId));
    }

    @GetMapping("/sla/overdue")
    public List<SlaView> overdue() {
        return service.overdue().stream().map(SlaView::from).toList();
    }

    @GetMapping("/sla/stats")
    public Stats stats(@RequestParam(required = false) Priority priority) {
        return new Stats(service.openCount(), service.overdue().size(),
                service.complianceRate(priority));
    }

    @GetMapping("/audit")
    public List<AuditLog> audit() {
        return service.recentAudit();
    }

    @GetMapping("/audit/{ticketId}")
    public List<AuditLog> auditFor(@PathVariable Long ticketId) {
        return service.auditFor(ticketId);
    }
}
