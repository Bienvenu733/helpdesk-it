"""Le service SLA est un plus : sa panne ne doit jamais empêcher de créer ou résoudre un ticket."""
import pytest
import requests

from tickets import sla_client

from .conftest import REAL_POST, client_for, create_ticket

pytestmark = pytest.mark.django_db


def test_created_and_resolved_events_are_sent(awa, kone, sla_calls):
    t = create_ticket(awa, priority="HIGH")
    client_for(kone).post(f"/api/tickets/{t['id']}/resolve/")

    paths = [path for path, _ in sla_calls]
    assert paths == ["ticket-created", "ticket-resolved"]
    created = sla_calls[0][1]
    assert created["ticketId"] == t["id"] and created["priority"] == "HIGH"
    assert "createdAt" in created and "resolvedAt" in sla_calls[1][1]


def test_ticket_is_created_even_if_the_sla_service_is_down(awa, monkeypatch):
    def down(*args, **kwargs):
        raise requests.ConnectionError("service SLA arrêté")

    monkeypatch.setattr(sla_client, "_post", REAL_POST)  # on veut tester le vrai code d'envoi
    monkeypatch.setattr(sla_client.requests, "post", down)
    r = client_for(awa).post(
        "/api/tickets/", {"title": "T", "description": "D"}, format="json"
    )
    assert r.status_code == 201


def test_post_sends_the_api_key_and_a_timeout(monkeypatch, settings):
    seen = {}

    class Ok:
        def raise_for_status(self):
            pass

    def fake(url, json, headers, timeout):
        seen.update(url=url, headers=headers, timeout=timeout)
        return Ok()

    settings.SLA_SERVICE_URL = "http://sla.test"
    settings.SLA_API_KEY = "secret"
    monkeypatch.setattr(sla_client, "_post", REAL_POST)
    monkeypatch.setattr(sla_client.requests, "post", fake)

    assert sla_client._post("ticket-created", {"ticketId": 1}) is True
    assert seen["url"] == "http://sla.test/api/events/ticket-created"
    assert seen["headers"] == {"X-API-Key": "secret"}
    assert seen["timeout"] == sla_client.TIMEOUT_SECONDS


def test_sla_endpoint_returns_nothing_for_untracked_tickets(awa, kone, monkeypatch):
    t = create_ticket(awa)
    monkeypatch.setattr(sla_client, "_get", lambda path: (404, None))
    r = client_for(awa).get(f"/api/tickets/{t['id']}/sla/")
    assert r.status_code == 200
    assert r.json() is None
    assert r["Content-Type"].startswith("application/json")
    assert r.content == b"null"  # un vrai JSON : le navigateur peut le lire avec res.json()


def test_sla_endpoint_reports_an_outage_with_503(awa, kone, monkeypatch):
    t = create_ticket(awa)
    monkeypatch.setattr(sla_client, "_get", lambda path: (None, None))
    assert client_for(awa).get(f"/api/tickets/{t['id']}/sla/").status_code == 503
