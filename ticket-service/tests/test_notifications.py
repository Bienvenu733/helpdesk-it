import pytest

from tickets.models import Notification

from .conftest import client_for, create_ticket

pytestmark = pytest.mark.django_db


def messages(user):
    return list(Notification.objects.filter(recipient=user).values_list("message", flat=True))


def test_technician_and_author_are_notified_of_the_assignment(awa, kone):
    create_ticket(awa, "PC en panne")
    assert any("vous a été attribué" in m for m in messages(kone))
    assert any("pris en charge par kone" in m for m in messages(awa))


def test_nobody_is_notified_while_the_ticket_waits(awa, bob):
    create_ticket(awa)  # aucun technicien
    assert Notification.objects.count() == 0


def test_notification_is_sent_when_a_waiting_ticket_is_finally_assigned(awa, bob, kone):
    first = create_ticket(awa)
    create_ticket(bob)
    assert messages(bob) == []
    client_for(kone).post(f"/api/tickets/{first['id']}/resolve/")
    assert any("pris en charge par kone" in m for m in messages(bob))
    assert sum("vous a été attribué" in m for m in messages(kone)) == 2


def test_author_is_notified_of_the_resolution(awa, kone):
    t = create_ticket(awa)
    client_for(kone).post(f"/api/tickets/{t['id']}/resolve/")
    assert any("a été résolu" in m for m in messages(awa))


def test_comments_notify_the_other_party_only(awa, kone):
    t = create_ticket(awa)
    Notification.objects.all().delete()

    client_for(kone).post(f"/api/tickets/{t['id']}/comments/", {"content": "Hello"}, format="json")
    assert len(messages(awa)) == 1 and messages(kone) == []

    client_for(awa).post(f"/api/tickets/{t['id']}/comments/", {"content": "Merci"}, format="json")
    assert len(messages(kone)) == 1 and len(messages(awa)) == 1


def test_admin_comment_notifies_both_parties(awa, kone, admin):
    t = create_ticket(awa)
    Notification.objects.all().delete()
    client_for(admin).post(f"/api/tickets/{t['id']}/comments/", {"content": "Suivi"}, format="json")
    assert len(messages(awa)) == 1 and len(messages(kone)) == 1
    assert messages(admin) == []


def test_other_technician_receives_nothing(awa, kone, traore):
    t = create_ticket(awa)
    other = traore if Notification.objects.filter(recipient=kone).exists() else kone
    client_for(awa).post(f"/api/tickets/{t['id']}/comments/", {"content": "x"}, format="json")
    assert messages(other) == []


def test_list_only_returns_my_notifications(awa, kone):
    create_ticket(awa)
    for user in (awa, kone):
        data = client_for(user).get("/api/notifications/").json()
        assert data["unread_count"] == len(data["results"]) >= 1
        assert all(n["message"] in messages(user) for n in data["results"])


def test_mark_one_as_read(awa, kone):
    create_ticket(awa)
    c = client_for(kone)
    nid = c.get("/api/notifications/").json()["results"][0]["id"]
    assert c.post(f"/api/notifications/{nid}/read/").status_code == 200
    assert c.get("/api/notifications/").json()["unread_count"] == 0


def test_cannot_touch_someone_elses_notification(awa, kone):
    create_ticket(awa)
    nid = Notification.objects.filter(recipient=kone).first().id
    assert client_for(awa).post(f"/api/notifications/{nid}/read/").status_code == 404
    assert Notification.objects.get(pk=nid).is_read is False


def test_mark_all_as_read(awa, kone):
    t = create_ticket(awa)
    client_for(awa).post(f"/api/tickets/{t['id']}/comments/", {"content": "a"}, format="json")
    c = client_for(kone)
    assert c.get("/api/notifications/").json()["unread_count"] >= 2
    c.post("/api/notifications/read-all/")
    assert c.get("/api/notifications/").json()["unread_count"] == 0
    # …sans toucher à celles des autres
    assert client_for(awa).get("/api/notifications/").json()["unread_count"] >= 1


def test_notifications_require_authentication():
    from rest_framework.test import APIClient
    assert APIClient().get("/api/notifications/").status_code == 401
