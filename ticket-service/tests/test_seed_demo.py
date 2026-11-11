import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from accounts.models import User

pytestmark = pytest.mark.django_db


def test_seed_creates_one_account_per_role(monkeypatch):
    monkeypatch.setenv("DEMO_PASSWORD", "un-mot-de-passe-solide")
    call_command("seed_demo")

    roles = dict(User.objects.values_list("username", "role"))
    assert roles["admin"] == "ADMIN"
    assert roles["technicien1"] == roles["technicien2"] == "TECHNICIAN"
    assert roles["utilisateur"] == "USER"
    assert User.objects.get(username="admin").check_password("un-mot-de-passe-solide")
    assert User.objects.get(username="admin").is_superuser
    assert not User.objects.get(username="utilisateur").is_superuser


def test_seed_is_idempotent_and_keeps_existing_passwords(monkeypatch):
    monkeypatch.setenv("DEMO_PASSWORD", "premier-mot-de-passe")
    call_command("seed_demo")
    monkeypatch.setenv("DEMO_PASSWORD", "second-mot-de-passe")
    call_command("seed_demo")

    assert User.objects.count() == 4
    assert User.objects.get(username="admin").check_password("premier-mot-de-passe")


def test_seed_refuses_to_run_without_a_password(monkeypatch):
    monkeypatch.delenv("DEMO_PASSWORD", raising=False)
    with pytest.raises(CommandError):
        call_command("seed_demo")
    assert User.objects.count() == 0


def test_seed_refuses_a_weak_password(monkeypatch):
    monkeypatch.setenv("DEMO_PASSWORD", "court")
    with pytest.raises(CommandError):
        call_command("seed_demo")
