package com.helpdesk.sla_service.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.helpdesk.sla_service.service.SlaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WarmUpTest {

    @Mock SlaService service;

    @Test
    void runsEveryKindOfQueryOnOracleIncludingThePlSqlFunction() {
        new WarmUp(service, "jdbc:oracle:thin:@//oracle:1521/FREEPDB1").warm();

        verify(service).openCount();
        verify(service).overdue();
        verify(service).all();
        verify(service).recentAudit();
        verify(service).complianceRate(null);
    }

    @Test
    void skipsThePlSqlFunctionOnOtherDatabases() {
        new WarmUp(service, "jdbc:h2:mem:slatest").warm();

        verify(service).openCount();
        verify(service, never()).complianceRate(null);
    }

    @Test
    void aFailureNeverPreventsStartup() {
        when(service.openCount()).thenThrow(new IllegalStateException("base indisponible"));

        assertDoesNotThrow(() -> new WarmUp(service, "jdbc:oracle:thin:@//oracle:1521/FREEPDB1").warm());
    }
}
