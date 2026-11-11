"""Envoi des événements de tickets au service SLA (Spring Boot)."""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# On n'attend pas indéfiniment : si le service SLA est lent, on abandonne vite.
TIMEOUT_SECONDS = 3


def _post(path, payload):
    """Envoie un événement. Ne lève jamais d'exception : voir la note ci-dessous."""
    url = f"{settings.SLA_SERVICE_URL}/api/events/{path}"
    try:
        response = requests.post(
            url,
            json=payload,
            headers={"X-API-Key": settings.SLA_API_KEY},
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return True
    except requests.RequestException:
        # Un ticket doit pouvoir être créé même si le service SLA est en panne.
        # On note l'erreur dans les logs au lieu de faire échouer la requête.
        logger.exception("Échec de l'envoi de l'événement %s au service SLA", path)
        return False


def _get(path):
    """Lit une donnée du service SLA. Renvoie (code_http, json) ou (None, None) si injoignable."""
    url = f"{settings.SLA_SERVICE_URL}/api/{path}"
    try:
        response = requests.get(
            url,
            headers={"X-API-Key": settings.SLA_API_KEY},
            timeout=TIMEOUT_SECONDS,
        )
        data = response.json() if response.ok else None
        return response.status_code, data
    except requests.RequestException:
        logger.exception("Échec de la lecture %s sur le service SLA", path)
        return None, None


def fetch_ticket_sla(ticket_id):
    return _get(f"sla/tickets/{ticket_id}")


def fetch_stats():
    return _get("sla/stats")


def notify_ticket_created(ticket):
    return _post("ticket-created", {
        "ticketId": ticket.id,
        "priority": ticket.priority,
        "createdAt": ticket.created_at.isoformat(),
    })


def notify_ticket_resolved(ticket):
    return _post("ticket-resolved", {
        "ticketId": ticket.id,
        "resolvedAt": ticket.resolved_at.isoformat(),
    })
