"""Un ticket est un échange privé entre son auteur et le technicien assigné (l'admin fait exception)."""
import pytest

from .conftest import client_for, create_ticket

pytestmark = pytest.mark.django_db


@pytest.fixture
def ticket(awa, kone):
    """Ticket d'awa, attribué automatiquement à kone (seul technicien libre)."""
    t = create_ticket(awa)
    assert t["assigned_to_id"] == kone.id
    return t


def ids(response):
    return {t["id"] for t in response.json()}


def test_user_only_sees_own_tickets(awa, bob, kone):
    mine = create_ticket(awa)
    other = create_ticket(bob)
    assert ids(client_for(awa).get("/api/tickets/")) == {mine["id"]}
    assert ids(client_for(bob).get("/api/tickets/")) == {other["id"]}


def test_technician_only_sees_assigned_tickets(awa, bob, kone, traore):
    t1 = create_ticket(awa)   # -> un technicien
    t2 = create_ticket(bob)   # -> l'autre
    seen_by_kone = ids(client_for(kone).get("/api/tickets/"))
    seen_by_traore = ids(client_for(traore).get("/api/tickets/"))
    assert seen_by_kone | seen_by_traore == {t1["id"], t2["id"]}
    assert seen_by_kone & seen_by_traore == set()


def test_waiting_ticket_is_invisible_to_technicians(awa, bob, kone):
    create_ticket(awa)                      # kone devient occupé
    waiting = create_ticket(bob)            # aucun technicien libre
    assert waiting["status"] == "OPEN" and waiting["assigned_to_id"] is None
    assert waiting["id"] not in ids(client_for(kone).get("/api/tickets/"))


def test_admin_sees_every_ticket(awa, bob, kone, admin):
    a = create_ticket(awa)
    b = create_ticket(bob)
    assert ids(client_for(admin).get("/api/tickets/")) == {a["id"], b["id"]}


def test_another_technician_gets_404_on_the_ticket(ticket, traore):
    c = client_for(traore)
    assert c.get(f"/api/tickets/{ticket['id']}/").status_code == 404
    assert c.get(f"/api/tickets/{ticket['id']}/comments/").status_code == 404
    assert c.get(f"/api/tickets/{ticket['id']}/sla/").status_code == 404
    assert c.post(f"/api/tickets/{ticket['id']}/resolve/").status_code == 404


def test_another_user_gets_404_on_the_ticket(ticket, bob):
    assert client_for(bob).get(f"/api/tickets/{ticket['id']}/").status_code == 404


@pytest.mark.parametrize("who", ["awa", "kone", "admin"])
def test_parties_and_admin_can_comment(ticket, awa, kone, admin, who):
    user = {"awa": awa, "kone": kone, "admin": admin}[who]
    r = client_for(user).post(
        f"/api/tickets/{ticket['id']}/comments/", {"content": "Bonjour"}, format="json"
    )
    assert r.status_code == 201


def test_outsiders_cannot_comment(ticket, bob, traore):
    for outsider in (bob, traore):
        r = client_for(outsider).post(
            f"/api/tickets/{ticket['id']}/comments/", {"content": "intrus"}, format="json"
        )
        assert r.status_code == 404


def test_comments_are_listed_for_the_parties(ticket, awa, kone):
    client_for(kone).post(
        f"/api/tickets/{ticket['id']}/comments/", {"content": "Je passe"}, format="json"
    )
    r = client_for(awa).get(f"/api/tickets/{ticket['id']}/comments/")
    assert [c["content"] for c in r.json()] == ["Je passe"]


def test_sla_stats_are_admin_only(awa, kone, admin):
    assert client_for(awa).get("/api/tickets/sla-stats/").status_code == 403
    assert client_for(kone).get("/api/tickets/sla-stats/").status_code == 403
    assert client_for(admin).get("/api/tickets/sla-stats/").status_code == 200


def test_client_cannot_set_server_managed_fields(awa, bob):
    r = client_for(awa).post(
        "/api/tickets/",
        {"title": "T", "description": "D", "status": "RESOLVED", "created_by": bob.id,
         "assigned_to": bob.id},
        format="json",
    )
    body = r.json()
    assert body["status"] == "OPEN"
    assert body["created_by_id"] == awa.id
    assert body["assigned_to_id"] is None


def test_tickets_cannot_be_deleted_or_replaced(ticket, awa):
    c = client_for(awa)
    assert c.delete(f"/api/tickets/{ticket['id']}/").status_code == 405
    assert c.put(f"/api/tickets/{ticket['id']}/", {}, format="json").status_code == 405
