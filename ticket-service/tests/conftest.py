"""Fixtures partagées par tous les tests."""
import pytest
from rest_framework.test import APIClient

from accounts.models import User
from tickets import sla_client

# Version réelle de l'envoi, gardée pour le test qui vérifie la tolérance aux pannes.
REAL_POST = sla_client._post


@pytest.fixture(autouse=True)
def fast_password_hashing(settings):
    """Le chiffrement des mots de passe est volontairement lent : inutile (et pénible) en test."""
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]


@pytest.fixture(autouse=True)
def sla_calls(monkeypatch):
    """Remplace le service SLA par un faux : aucun test ne fait d'appel réseau.

    Renvoie la liste des événements « envoyés » pour pouvoir les vérifier.
    """
    calls = []

    def fake_post(path, payload):
        calls.append((path, payload))
        return True

    monkeypatch.setattr(sla_client, "_post", fake_post)
    monkeypatch.setattr(
        sla_client, "_get",
        lambda path: (200, {"open": 0, "overdue": 0, "complianceRate": None}),
    )
    return calls


def make_user(username, role=User.Role.USER):
    return User.objects.create_user(username=username, password="motdepasse123", role=role)


def client_for(user):
    """Client d'API déjà authentifié comme `user` (sans passer par la connexion)."""
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def awa(db):
    return make_user("awa")


@pytest.fixture
def bob(db):
    return make_user("bob")


@pytest.fixture
def kone(db):
    return make_user("kone", User.Role.TECHNICIAN)


@pytest.fixture
def traore(db):
    return make_user("traore", User.Role.TECHNICIAN)


@pytest.fixture
def admin(db):
    return make_user("moise", User.Role.ADMIN)


def create_ticket(user, title="PC en panne", priority="MEDIUM", category="HARDWARE"):
    """Crée un ticket via l'API, comme le ferait l'interface."""
    response = client_for(user).post(
        "/api/tickets/",
        {"title": title, "description": "Description", "priority": priority, "category": category},
        format="json",
    )
    assert response.status_code == 201, response.content
    return response.json()
