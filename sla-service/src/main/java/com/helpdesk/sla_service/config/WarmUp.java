package com.helpdesk.sla_service.config;

import com.helpdesk.sla_service.service.SlaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Exécute une fois chaque type de requête au démarrage.
 *
 * <p>Sans cela, le tout premier appel après un redémarrage prend plusieurs secondes (première
 * requête SQL, première exécution de la fonction PL/SQL, initialisation de Hibernate). Or le
 * service Django n'attend que 3 s : il abandonnait l'envoi, et l'événement de suivi du premier
 * ticket était perdu. On paie ce coût ici, avant de recevoir du trafic.
 */
@Component
public class WarmUp {

    private static final Logger log = LoggerFactory.getLogger(WarmUp.class);

    private final SlaService service;
    private final boolean oracle;

    public WarmUp(SlaService service, @Value("${spring.datasource.url}") String datasourceUrl) {
        this.service = service;
        this.oracle = datasourceUrl.startsWith("jdbc:oracle:");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void warm() {
        long start = System.nanoTime();
        try {
            service.openCount();
            service.overdue();
            service.all();
            service.recentAudit();
            if (oracle) {
                service.complianceRate(null); // la fonction PL/SQL n'existe que sur Oracle
            }
            log.info("Réchauffement terminé en {} ms", (System.nanoTime() - start) / 1_000_000);
        } catch (RuntimeException e) {
            // Un échec ici ne doit jamais empêcher le service de démarrer.
            log.warn("Réchauffement incomplet : {}", e.toString());
        }
    }
}
