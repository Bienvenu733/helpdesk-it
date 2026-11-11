import pytest
from rest_framework.test import APIClient

from accounts.models import User

from .conftest import client_for

pytestmark = pytest.mark.django_db


def test_register_creates_a_simple_user():
    r = APIClient().post(
        "/api/auth/register/",
        {"username": "awa", "email": "awa@test.com", "password": "motdepasse123"},
        format="json",
    )
    assert r.status_code == 201
    assert User.objects.get(username="awa").role == User.Role.USER


def test_register_ignores_a_requested_role():
    """Personne ne peut se déclarer administrateur à l'inscription."""
    APIClient().post(
        "/api/auth/register/",
        {"username": "pirate", "password": "motdepasse123", "role": "ADMIN"},
        format="json",
    )
    assert User.objects.get(username="pirate").role == User.Role.USER


def test_register_never_returns_the_password():
    r = APIClient().post(
        "/api/auth/register/", {"username": "awa", "password": "motdepasse123"}, format="json"
    )
    assert "password" not in r.json()


def test_register_rejects_a_short_password():
    r = APIClient().post(
        "/api/auth/register/", {"username": "awa", "password": "court"}, format="json"
    )
    assert r.status_code == 400


def test_login_returns_tokens(awa):
    r = APIClient().post(
        "/api/auth/login/", {"username": "awa", "password": "motdepasse123"}, format="json"
    )
    assert r.status_code == 200
    assert {"access", "refresh"} <= set(r.json())


def test_login_with_a_wrong_password_is_refused(awa):
    r = APIClient().post(
        "/api/auth/login/", {"username": "awa", "password": "faux"}, format="json"
    )
    assert r.status_code == 401


def test_me_returns_the_role(kone):
    r = client_for(kone).get("/api/auth/me/")
    assert r.json() == {"id": kone.id, "username": "kone", "role": "TECHNICIAN"}


def test_api_requires_authentication():
    assert APIClient().get("/api/tickets/").status_code == 401
    assert APIClient().get("/api/auth/me/").status_code == 401
