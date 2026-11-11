package com.helpdesk.sla_service;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Test de bout en bout : toute l'application démarre (filtre, contrôleurs, service, JPA)
 * sur une base H2 en mémoire (profil « test »). Seule la fonction PL/SQL d'Oracle n'est pas couverte.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SlaServiceApplicationTests {

    private static final String KEY = "X-API-Key";

    @Autowired MockMvc mvc;

    @Test
    void contextLoads() {
    }

    @Test
    void healthEndpointIsOpen() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void fullLifecycleOfATicket() throws Exception {
        long id = 880_001L;
        String created = Instant.now().minus(Duration.ofHours(10)).toString();

        // 1. Création : ticket « Haute » (8 h) vieux de 10 h => déjà en retard
        mvc.perform(post("/api/events/ticket-created").header(KEY, "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ticketId\":" + id + ",\"priority\":\"HIGH\",\"createdAt\":\"" + created + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.breached").value(true));

        // 2. Il apparaît dans les retards
        mvc.perform(get("/api/sla/overdue").header(KEY, "test-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.ticketId==" + id + ")]", hasSize(1)));

        // 3. Le même événement reçu deux fois ne crée pas de doublon
        mvc.perform(post("/api/events/ticket-created").header(KEY, "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ticketId\":" + id + ",\"priority\":\"LOW\",\"createdAt\":\"" + created + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.priority").value("HIGH"));

        // 4. Résolution : il sort des retards (il n'est plus à traiter)
        mvc.perform(post("/api/events/ticket-resolved").header(KEY, "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ticketId\":" + id + ",\"resolvedAt\":\"" + Instant.now() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());
        mvc.perform(get("/api/sla/overdue").header(KEY, "test-key"))
                .andExpect(jsonPath("$[?(@.ticketId==" + id + ")]", hasSize(0)));

        // 5. La piste d'audit a gardé les deux étapes, dans l'ordre
        mvc.perform(get("/api/audit/" + id).header(KEY, "test-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].eventType").value("TICKET_CREATED"))
                .andExpect(jsonPath("$[1].eventType").value("TICKET_RESOLVED"));
    }

    @Test
    void unknownTicketIs404() throws Exception {
        mvc.perform(get("/api/sla/tickets/999999").header(KEY, "test-key"))
                .andExpect(status().isNotFound());
    }

    @Test
    void apiIsClosedWithoutTheKey() throws Exception {
        mvc.perform(get("/api/audit")).andExpect(status().isUnauthorized());
    }
}
