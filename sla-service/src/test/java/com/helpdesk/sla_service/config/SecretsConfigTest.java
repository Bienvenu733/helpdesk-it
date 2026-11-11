package com.helpdesk.sla_service.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/**
 * Garde-fou : la configuration principale ne doit contenir aucune valeur secrète par défaut.
 * Sans variable d'environnement, le service doit refuser de démarrer plutôt que d'utiliser
 * une clé ou un mot de passe publiés sur GitHub. Les valeurs de développement sont isolées
 * dans application-dev.properties (profil « dev », jamais actif en production).
 */
class SecretsConfigTest {

    private static Properties load(String file) throws IOException {
        Properties props = new Properties();
        try (InputStream in = new ClassPathResource(file).getInputStream()) {
            props.load(in);
        }
        return props;
    }

    @Test
    void mainConfigurationHasNoDefaultSecret() throws IOException {
        Properties main = load("application.properties");

        // « ${NOM} » sans « :valeur » : la variable est obligatoire.
        assertEquals("${SLA_API_KEY}", main.getProperty("sla.api-key"));
        assertEquals("${DB_PASSWORD}", main.getProperty("spring.datasource.password"));
    }

    @Test
    void developmentValuesLiveInTheDevProfileOnly() throws IOException {
        Properties main = load("application.properties");
        Properties dev = load("application-dev.properties");

        assertFalse(main.values().stream().anyMatch(v -> v.toString().contains("dev-key")));
        assertEquals("dev-key-change-me", dev.getProperty("sla.api-key"));
    }
}
