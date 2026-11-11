package com.helpdesk.sla_service.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class PlSqlInstallerTest {

    @Mock JdbcTemplate jdbc;

    @Test
    void installsTheFunctionOnOracle() {
        new PlSqlInstaller(jdbc, "jdbc:oracle:thin:@//oracle:1521/FREEPDB1").run(null);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).execute(sql.capture());
        assertTrue(sql.getValue().contains("CREATE OR REPLACE FUNCTION sla_compliance_rate"));
        // Le « / » final est une commande sqlplus : JDBC ne doit pas le recevoir.
        assertFalse(sql.getValue().lines().anyMatch(line -> line.strip().equals("/")));
        assertTrue(sql.getValue().endsWith("END sla_compliance_rate;"));
    }

    @Test
    void doesNothingOnAnotherDatabase() {
        new PlSqlInstaller(jdbc, "jdbc:h2:mem:slatest").run(null);

        verifyNoInteractions(jdbc);
    }
}
