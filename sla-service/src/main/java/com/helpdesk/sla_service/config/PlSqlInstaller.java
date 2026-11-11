package com.helpdesk.sla_service.config;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Installe la fonction PL/SQL {@code sla_compliance_rate} au démarrage.
 *
 * <p>Elle doit exister dans Oracle pour que {@code /api/sla/stats} fonctionne. L'installer ici
 * (plutôt qu'à la main avec sqlplus) rend le déploiement reproductible : une base neuve est prête
 * dès le premier démarrage. {@code CREATE OR REPLACE} rend l'opération rejouable sans danger.
 *
 * <p>Ce runner s'exécute une fois le contexte démarré, donc après la création des tables par
 * Hibernate (la fonction lit {@code ticket_sla}). Il ne fait rien sur une autre base (H2 en test),
 * qui ne comprend pas le PL/SQL.
 */
@Component
public class PlSqlInstaller implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PlSqlInstaller.class);
    static final String SCRIPT = "db/oracle/sla_compliance.sql";

    private final JdbcTemplate jdbc;
    private final String datasourceUrl;

    public PlSqlInstaller(JdbcTemplate jdbc, @Value("${spring.datasource.url}") String datasourceUrl) {
        this.jdbc = jdbc;
        this.datasourceUrl = datasourceUrl;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!datasourceUrl.startsWith("jdbc:oracle:")) {
            return;
        }
        jdbc.execute(loadStatement());
        log.info("Fonction PL/SQL sla_compliance_rate installée");
    }

    /** Lit le script et retire la ligne « / », qui est une commande de sqlplus, pas du SQL. */
    static String loadStatement() {
        try {
            String script = new ClassPathResource(SCRIPT).getContentAsString(StandardCharsets.UTF_8);
            return script.replaceAll("(?m)^/\\s*$", "").strip();
        } catch (IOException e) {
            throw new UncheckedIOException("Script PL/SQL introuvable : " + SCRIPT, e);
        }
    }
}
