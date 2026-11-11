-- Fonction PL/SQL : taux (en %) de tickets résolus dans les délais.
-- p_priority NULL = toutes priorités confondues. Renvoie NULL s'il n'y a aucun ticket résolu.
CREATE OR REPLACE FUNCTION sla_compliance_rate(p_priority IN VARCHAR2)
RETURN NUMBER
IS
    v_total NUMBER;
    v_ok    NUMBER;
BEGIN
    SELECT COUNT(*),
           COUNT(CASE WHEN resolved_at <= deadline THEN 1 END)
      INTO v_total, v_ok
      FROM ticket_sla
     WHERE resolved_at IS NOT NULL
       AND (p_priority IS NULL OR priority = p_priority);

    IF v_total = 0 THEN
        RETURN NULL;
    END IF;

    RETURN ROUND(v_ok * 100 / v_total, 1);
END sla_compliance_rate;
/
