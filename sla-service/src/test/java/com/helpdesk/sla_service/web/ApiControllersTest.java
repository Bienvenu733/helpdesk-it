package com.helpdesk.sla_service.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.helpdesk.sla_service.model.Priority;
import com.helpdesk.sla_service.model.TicketSla;
import com.helpdesk.sla_service.service.SlaService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

/** Tests de la couche web : le service est simulé, on vérifie HTTP, la validation et la clé API. */
@WebMvcTest({EventController.class, SlaController.class})
@TestPropertySource(properties = "sla.api-key=test-key")
class ApiControllersTest {

    private static final String KEY = "X-API-Key";
    private static final String CREATED_BODY =
            "{\"ticketId\":7,\"priority\":\"HIGH\",\"createdAt\":\"2026-11-10T08:00:00Z\"}";

    @Autowired MockMvc mvc;
    @MockitoBean SlaService service;

    // ---- clé API ---------------------------------------------------------------------------

    @Test
    void requestWithoutApiKeyIsRefused() throws Exception {
        mvc.perform(get("/api/sla/tickets")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void requestWithWrongApiKeyIsRefused() throws Exception {
        mvc.perform(get("/api/sla/tickets").header(KEY, "mauvaise-cle"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void writingEventsAlsoRequiresTheKey() throws Exception {
        mvc.perform(post("/api/events/ticket-created")
                        .contentType(MediaType.APPLICATION_JSON).content(CREATED_BODY))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    // ---- événements -------------------------------------------------------------------------

    @Test
    void ticketCreatedReturns201WithTheDeadline() throws Exception {
        Instant created = Instant.parse("2026-11-10T08:00:00Z");
        when(service.onTicketCreated(eq(7L), eq(Priority.HIGH), any(Instant.class)))
                .thenReturn(new TicketSla(7L, Priority.HIGH, created));

        mvc.perform(post("/api/events/ticket-created").header(KEY, "test-key")
                        .contentType(MediaType.APPLICATION_JSON).content(CREATED_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticketId").value(7))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.breached").value(true)); // échéance 2026-11-10 16:00 : dépassée
        verify(service).onTicketCreated(eq(7L), eq(Priority.HIGH), eq(created));
    }

    @Test
    void unknownPriorityIsRejected() throws Exception {
        mvc.perform(post("/api/events/ticket-created").header(KEY, "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ticketId\":7,\"priority\":\"URGENT\",\"createdAt\":\"2026-11-10T08:00:00Z\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void missingFieldsAreRejected() throws Exception {
        mvc.perform(post("/api/events/ticket-created").header(KEY, "test-key")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"priority\":\"HIGH\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void malformedJsonIsRejected() throws Exception {
        mvc.perform(post("/api/events/ticket-resolved").header(KEY, "test-key")
                        .contentType(MediaType.APPLICATION_JSON).content("pas du json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resolvingAnUnknownTicketReturns404() throws Exception {
        when(service.onTicketResolved(eq(99L), any(Instant.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket inconnu : 99"));

        mvc.perform(post("/api/events/ticket-resolved").header(KEY, "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ticketId\":99,\"resolvedAt\":\"2026-11-10T09:00:00Z\"}"))
                .andExpect(status().isNotFound());
    }

    // ---- consultation -----------------------------------------------------------------------

    @Test
    void oneTicketIsReturnedByItsDjangoId() throws Exception {
        when(service.findByTicketId(7L))
                .thenReturn(new TicketSla(7L, Priority.LOW, Instant.now()));

        mvc.perform(get("/api/sla/tickets/7").header(KEY, "test-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticketId").value(7))
                .andExpect(jsonPath("$.breached").value(false));
    }

    @Test
    void overdueListsOnlyWhatTheServiceReturns() throws Exception {
        when(service.overdue()).thenReturn(List.of(
                new TicketSla(1L, Priority.CRITICAL, Instant.parse("2026-01-01T00:00:00Z"))));

        mvc.perform(get("/api/sla/overdue").header(KEY, "test-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].breached").value(true));
    }

    @Test
    void statsCombineCountsAndThePlSqlRate() throws Exception {
        when(service.openCount()).thenReturn(4L);
        when(service.overdue()).thenReturn(List.of(
                new TicketSla(1L, Priority.CRITICAL, Instant.parse("2026-01-01T00:00:00Z"))));
        when(service.complianceRate(null)).thenReturn(66.7);

        mvc.perform(get("/api/sla/stats").header(KEY, "test-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(4))
                .andExpect(jsonPath("$.overdue").value(1))
                .andExpect(jsonPath("$.complianceRate").value(66.7));
    }

    @Test
    void statsCanBeFilteredByPriority() throws Exception {
        when(service.complianceRate(Priority.HIGH)).thenReturn(100.0);
        when(service.overdue()).thenReturn(List.of());

        mvc.perform(get("/api/sla/stats?priority=HIGH").header(KEY, "test-key"))
                .andExpect(jsonPath("$.complianceRate").value(100.0));
    }

    @Test
    void invalidPriorityFilterIsRejected() throws Exception {
        mvc.perform(get("/api/sla/stats?priority=URGENT").header(KEY, "test-key"))
                .andExpect(status().isBadRequest());
    }
}
