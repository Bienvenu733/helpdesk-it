"""Les secrets ne doivent jamais avoir de valeur par défaut en production."""
import os
import subprocess
import sys
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parent.parent


def load_settings(**env):
    """Importe les réglages dans un processus neuf avec EXACTEMENT cet environnement."""
    clean_env = {
        "PATH": os.environ.get("PATH", ""),
        "DJANGO_SETTINGS_MODULE": "config.settings",
        **env,
    }
    return subprocess.run(
        [sys.executable, "-c", "import config.settings as s; print(s.SECRET_KEY, s.SLA_API_KEY)"],
        cwd=PROJECT, env=clean_env, capture_output=True, text=True,
    )


def test_production_refuses_to_start_without_a_secret_key():
    result = load_settings(DJANGO_DEBUG="false", SLA_API_KEY="une-cle")
    assert result.returncode != 0
    assert "DJANGO_SECRET_KEY" in result.stderr


def test_production_refuses_to_start_without_the_sla_key():
    result = load_settings(DJANGO_DEBUG="false", DJANGO_SECRET_KEY="une-cle-secrete")
    assert result.returncode != 0
    assert "SLA_API_KEY" in result.stderr


def test_production_starts_when_secrets_are_provided():
    result = load_settings(DJANGO_DEBUG="false", DJANGO_SECRET_KEY="secret-a", SLA_API_KEY="secret-b")
    assert result.returncode == 0, result.stderr
    assert result.stdout.split() == ["secret-a", "secret-b"]


def test_an_empty_value_counts_as_missing():
    result = load_settings(DJANGO_DEBUG="false", DJANGO_SECRET_KEY="", SLA_API_KEY="x")
    assert result.returncode != 0


def test_development_mode_may_use_the_local_defaults():
    result = load_settings()  # DEBUG par défaut
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize("name", ["DJANGO_SECRET_KEY", "SLA_API_KEY"])
def test_a_real_value_always_wins_over_the_default(name):
    result = load_settings(**{name: "valeur-reelle"})
    assert "valeur-reelle" in result.stdout
