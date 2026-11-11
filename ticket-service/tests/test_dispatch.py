"""Répartition automatique : un technicien = un ticket à la fois, file d'attente par urgence."""
import pytest

from accounts.models import User
from tickets.dispatch import dispatch_waiting, free_technicians
from tickets.models import Ticket

from .conftest import client_for, create_ticket, make_user

pytestmark = pytest.mark.django_db


def test_ticket_goes_straight_to_a_free_technician(awa, kone):
    t = create_ticket(awa)
    assert t["status"] == "IN_PROGRESS"
    assert t["assigned_to_id"] == kone.id


def test_ticket_waits_when_every_technician_is_busy(awa, bob, kone):
    create_ticket(awa)
    second = create_ticket(bob)
    assert second["status"] == "OPEN"
    assert second["assigned_to_id"] is None


def test_ticket_waits_when_there_is_no_technician_at_all(awa):
    assert create_ticket(awa)["status"] == "OPEN"


def test_a_technician_never_holds_two_tickets(awa, kone):
    for _ in range(4):
        create_ticket(awa)
    assert Ticket.objects.filter(assigned_to=kone, status="IN_PROGRESS").count() == 1
    assert Ticket.objects.filter(status="OPEN", assigned_to__isnull=True).count() == 3


def test_resolving_gives_the_next_waiting_ticket_automatically(awa, bob, kone):
    first = create_ticket(awa)
    waiting = create_ticket(bob)
    r = client_for(kone).post(f"/api/tickets/{first['id']}/resolve/")
    assert r.status_code == 200
    nxt = Ticket.objects.get(pk=waiting["id"])
    assert nxt.status == Ticket.Status.IN_PROGRESS
    assert nxt.assigned_to == kone


def test_queue_is_served_by_priority_then_age(awa, kone):
    running = create_ticket(awa, "En cours", "LOW")
    low = create_ticket(awa, "Basse", "LOW")
    medium = create_ticket(awa, "Moyenne", "MEDIUM")
    critical = create_ticket(awa, "Critique", "CRITICAL")
    old_high = create_ticket(awa, "Haute ancienne", "HIGH")
    new_high = create_ticket(awa, "Haute récente", "HIGH")

    order = []
    current = running["id"]
    for _ in range(5):
        client_for(kone).post(f"/api/tickets/{current}/resolve/")
        current = Ticket.objects.get(assigned_to=kone, status="IN_PROGRESS").id
        order.append(current)

    assert order == [critical["id"], old_high["id"], new_high["id"], medium["id"], low["id"]]


def test_tickets_are_shared_fairly_between_free_technicians(awa, kone, traore):
    # kone a déjà pris plusieurs tickets : traore doit passer en premier.
    first = create_ticket(awa)
    busy_one = Ticket.objects.get(pk=first["id"]).assigned_to
    other = traore if busy_one == kone else kone
    second = create_ticket(awa)
    assert second["assigned_to_id"] == other.id


def test_only_active_technicians_receive_tickets(awa, kone):
    kone.is_active = False
    kone.save()
    assert create_ticket(awa)["status"] == "OPEN"


def test_admins_and_users_never_receive_tickets(awa, admin):
    assert create_ticket(awa)["assigned_to_id"] is None


def test_a_new_technician_is_free(kone):
    assert list(free_technicians()) == [kone]


def test_dispatch_is_idempotent(awa, kone):
    create_ticket(awa)
    assert dispatch_waiting() == []


def test_assignment_is_logged(awa, kone):
    t = create_ticket(awa)
    events = list(Ticket.objects.get(pk=t["id"]).events.values_list("event_type", "actor__username"))
    assert ("CREATED", "awa") in events
    assert ("ASSIGNED", "kone") in events


# --- Résolution -----------------------------------------------------------------------------

def test_resolve_sets_the_resolution_date_and_status(awa, kone):
    t = create_ticket(awa)
    r = client_for(kone).post(f"/api/tickets/{t['id']}/resolve/")
    assert r.json()["status"] == "RESOLVED"
    assert r.json()["resolved_at"] is not None


def test_a_waiting_ticket_cannot_be_resolved(awa, bob, kone, admin):
    create_ticket(awa)
    waiting = create_ticket(bob)
    r = client_for(admin).post(f"/api/tickets/{waiting['id']}/resolve/")
    assert r.status_code == 400


def test_a_ticket_cannot_be_resolved_twice(awa, kone):
    t = create_ticket(awa)
    client_for(kone).post(f"/api/tickets/{t['id']}/resolve/")
    assert client_for(kone).post(f"/api/tickets/{t['id']}/resolve/").status_code == 400


def test_a_simple_user_cannot_resolve(awa, kone):
    t = create_ticket(awa)
    assert client_for(awa).post(f"/api/tickets/{t['id']}/resolve/").status_code == 403


def test_admin_can_resolve_any_ticket(awa, kone, admin):
    t = create_ticket(awa)
    assert client_for(admin).post(f"/api/tickets/{t['id']}/resolve/").status_code == 200


def test_resolution_frees_the_technician(awa, kone):
    t = create_ticket(awa)
    assert list(free_technicians()) == []
    client_for(kone).post(f"/api/tickets/{t['id']}/resolve/")
    assert list(free_technicians()) == [kone]


def test_resolution_by_one_technician_does_not_free_another(awa, bob, kone, traore):
    t1, t2 = create_ticket(awa), create_ticket(bob)
    holder = User.objects.get(pk=t1["assigned_to_id"])
    client_for(holder).post(f"/api/tickets/{t1['id']}/resolve/")
    busy = User.objects.get(pk=t2["assigned_to_id"])
    assert busy not in list(free_technicians())
