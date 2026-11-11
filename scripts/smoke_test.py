#!/usr/bin/env python3
"""Test de bout en bout de la pile Docker complète (Django + Postgres + Spring Boot + Oracle).

    docker compose up -d --build --wait
    python3 scripts/smoke_test.py

Il rejoue un parcours réel à travers les HTTP publics, comme le ferait un utilisateur, et vérifie
que les services se parlent vraiment : création, répartition, suivi SLA dans Oracle, audit,
résolution, statistiques (PL/SQL), confidentialité, sécurité.

Configuration : lue dans .env (ou ENV_FILE), surchargeable par l'environnement
(API_URL, SLA_URL, FRONT_URL, DJANGO_PORT, SLA_PORT, FRONTEND_PORT). Aucune dépendance : bibliothèque
standard uniquement.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request


def read_env_file(path):
    values = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    values[key.strip()] = value.strip()
    return values


CFG = {**read_env_file(os.environ.get("ENV_FILE", ".env")), **os.environ}
API = CFG.get("API_URL") or f"http://localhost:{CFG.get('DJANGO_PORT', '8000')}/api"
SLA = CFG.get("SLA_URL") or f"http://localhost:{CFG.get('SLA_PORT', '8081')}"
FRONT = CFG.get("FRONT_URL") or f"http://localhost:{CFG.get('FRONTEND_PORT', '3000')}"
PASSWORD = CFG.get("DEMO_PASSWORD", "")
SLA_KEY = CFG.get("SLA_API_KEY", "")

passed = 0


def check(condition, label):
    """Affiche le résultat d'une vérification ; la première qui échoue arrête le test."""
    global passed
    if not condition:
        print(f"  ✗ {label}", file=sys.stderr)
        sys.exit(f"ÉCHEC : {label}")
    passed += 1
    print(f"  ✓ {label}")


def call(method, url, token=None, body=None, headers=None):
    """Appel HTTP. Renvoie (code, json_ou_None). Un code d'erreur n'est pas une exception."""
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    for name, value in (headers or {}).items():
        request.add_header(name, value)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw, code = response.read(), response.status
    except urllib.error.HTTPError as error:
        raw, code = error.read(), error.code
    except OSError:
        return 0, None  # service injoignable : la vérification échouera avec un message clair
    try:
        return code, json.loads(raw) if raw else None
    except ValueError:
        return code, None


def sla(path):
    return call("GET", f"{SLA}{path}", headers={"X-API-Key": SLA_KEY})


def login(username):
    code, data = call("POST", f"{API}/auth/login/", body={"username": username, "password": PASSWORD})
    check(code == 200 and data and "access" in data, f"connexion de « {username} »")
    return data["access"]


def wait_for(url, label, seconds=90):
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=5)
            return
        except urllib.error.HTTPError:
            return  # le serveur répond (même par une erreur HTTP) : il est prêt
        except OSError:
            time.sleep(2)
    sys.exit(f"ÉCHEC : {label} ne répond pas après {seconds} s ({url})")


def main():
    if not PASSWORD or not SLA_KEY:
        sys.exit("DEMO_PASSWORD et SLA_API_KEY sont requis (fichier .env ou variables d'environnement).")

    print("Services")
    wait_for(f"{FRONT}/login", "frontend")
    check(call("GET", f"{FRONT}/login")[0] == 200, "l'interface répond")
    check(call("GET", f"{SLA}/actuator/health")[0] == 200, "Spring Boot est en bonne santé")
    check(call("GET", f"{SLA}/api/sla/stats")[0] == 401, "Spring Boot refuse un appel sans clé API")
    check(sla("/api/sla/stats")[0] == 200, "Spring Boot accepte la bonne clé (Oracle + PL/SQL opérationnels)")

    print("Connexions")
    user, tech1, tech2, admin = (login(n) for n in ("utilisateur", "technicien1", "technicien2", "admin"))
    code, me = call("GET", f"{API}/auth/me/", admin)
    check(code == 200 and me["role"] == "ADMIN", "le rôle est bien renvoyé")

    print("Création de tickets")
    created = []
    for title, priority in (("A", "CRITICAL"), ("B", "HIGH"), ("C", "LOW")):
        code, ticket = call(
            "POST", f"{API}/tickets/", user,
            {"title": f"[SMOKE] {title}", "description": "test de bout en bout",
             "priority": priority, "category": "NETWORK"},
        )
        check(code == 201, f"ticket {title} ({priority}) créé")
        created.append(ticket["id"])
    code, tickets = call("GET", f"{API}/tickets/", user)
    status = {t["id"]: t["status"] for t in tickets}
    check(sum(status[i] == "IN_PROGRESS" for i in created) >= 1, "au moins un ticket attribué immédiatement")
    check(sum(1 for t in tickets if t["status"] == "IN_PROGRESS") <= 2, "un technicien traite un seul ticket à la fois")

    print("Suivi SLA (Django -> Spring Boot -> Oracle)")
    for ticket_id in created:
        code, tracked = sla(f"/api/sla/tickets/{ticket_id}")
        check(code == 200 and tracked["ticketId"] == ticket_id, f"ticket {ticket_id} reçu et stocké par Spring Boot")

    print("Résolution et file d'attente")
    technicians = {"technicien1": tech1, "technicien2": tech2}
    resolver = {}
    for _ in range(12):
        for name, token in technicians.items():
            code, mine = call("GET", f"{API}/tickets/mine/", token)
            for t in mine:
                if t["id"] in created and t["status"] == "IN_PROGRESS":
                    code, _ = call("POST", f"{API}/tickets/{t['id']}/resolve/", token)
                    check(code == 200, f"{name} résout le ticket {t['id']}")
                    resolver[t["id"]] = name
        code, tickets = call("GET", f"{API}/tickets/", user)
        if all(t["status"] == "RESOLVED" for t in tickets if t["id"] in created):
            break
    check(len(resolver) == len(created), "les 3 tickets sont résolus (les tickets en attente ont été attribués automatiquement)")

    print("Audit et statistiques")
    for ticket_id in created:
        code, tracked = sla(f"/api/sla/tickets/{ticket_id}")
        check(tracked["resolvedAt"] is not None, f"ticket {ticket_id} : résolution reçue par Spring Boot")
        code, events = sla(f"/api/audit/{ticket_id}")
        types = [e["eventType"] for e in events]
        check(types == ["TICKET_CREATED", "TICKET_RESOLVED"], f"ticket {ticket_id} : piste d'audit complète")
    code, stats = call("GET", f"{API}/admin/stats/", admin)
    check(code == 200 and stats["totals"]["resolved"] >= len(created), "statistiques administrateur (PostgreSQL)")
    check(stats["sla"] is not None and stats["sla"]["complianceRate"] is not None,
          "taux de respect du SLA calculé par la fonction PL/SQL d'Oracle")

    print("Notifications")
    code, notifs = call("GET", f"{API}/notifications/", user)
    check(code == 200 and notifs["unread_count"] >= len(created), "l'auteur est prévenu de la prise en charge et de la résolution")

    print("Confidentialité et sécurité")
    first = created[0]
    other = "technicien2" if resolver[first] == "technicien1" else "technicien1"
    check(call("GET", f"{API}/tickets/{first}/", technicians[other])[0] == 404, "un autre technicien ne voit pas le ticket")
    check(call("GET", f"{API}/tickets/{first}/", admin)[0] == 200, "l'administrateur le voit")
    check(call("GET", f"{API}/admin/stats/", user)[0] == 403, "un utilisateur n'accède pas à l'administration")
    check(call("GET", f"{API}/tickets/")[0] == 401, "l'API refuse un appel sans connexion")

    print(f"\nOK : {passed} vérifications réussies")


if __name__ == "__main__":
    main()
