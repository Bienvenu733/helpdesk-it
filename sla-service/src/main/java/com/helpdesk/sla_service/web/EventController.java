package com.helpdesk.sla_service.web;

import com.helpdesk.sla_service.model.Priority;
import com.helpdesk.sla_service.model.TicketSla;
import com.helpdesk.sla_service.service.SlaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Points d'entrée appelés par le service Django. */
@RestController
@RequestMapping("/api/events")
public class EventController {

    public record TicketCreated(
            @NotNull Long ticketId,
            @NotNull Priority priority,
            @NotNull Instant createdAt) {}

    public record TicketResolved(
            @NotNull Long ticketId,
            @NotNull Instant resolvedAt) {}

    private final SlaService service;

    public EventController(SlaService service) {
        this.service = service;
    }

    @PostMapping("/ticket-created")
    @ResponseStatus(HttpStatus.CREATED)
    public SlaView created(@Valid @RequestBody TicketCreated event) {
        TicketSla sla = service.onTicketCreated(event.ticketId(), event.priority(), event.createdAt());
        return SlaView.from(sla);
    }

    @PostMapping("/ticket-resolved")
    public SlaView resolved(@Valid @RequestBody TicketResolved event) {
        return SlaView.from(service.onTicketResolved(event.ticketId(), event.resolvedAt()));
    }
}
