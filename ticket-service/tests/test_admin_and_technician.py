import pytest

from .conftest import client_for, create_ticket

pytestmark = pytest.mark.django_db

ADMIN_ROUTES = ["/api/admin/stats/", "/api/admin/users/", "/api/admin/activity/"]


@pytest.mark.parametrize("url", ADMIN_ROUTES)
def test_admin_routes_are_forbidden_to_others(url, awa, kone):
    assert client_for(awa).get(url).status_code == 403
    assert client_for(kone).get(url).status_code == 403


@pytest.mark.parametrize("url", ADMIN_ROUTES)
def test_admin_routes_are_open_to_the_admin(url, admin):
    assert client_for(admin).get(url).status_code == 200


def test_stats_count_tickets_by_state(awa, bob, kone, admin):
    t = create_ticket(awa, priority="HIGH", category="NETWORK")
    create_ticket(bob, priority="LOW", category="HARDWARE")   # en attente
    client_for(kone).post(f"/api/tickets/{t['id']}/resolve/")  # kone prend le second
    s = client_for(admin).get("/api/admin/stats/").json()

    assert s["totals"]["total"] == 2
    assert s["totals"]["resolved"] == 1
    assert s["totals"]["in_progress"] == 1
    assert s["totals"]["waiting"] == 0
    assert s["totals"]["technicians"] == 1 and s["totals"]["technicians_busy"] == 1

    by_prio = {r["key"]: r["count"] for r in s["by_priority"]}
    assert by_prio == {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 0, "LOW": 1}
    by_cat = {r["key"]: r["count"] for r in s["by_category"]}
    assert by_cat["NETWORK"] == 1 and by_cat["HARDWARE"] == 1 and by_cat["SOFTWARE"] == 0


def test_stats_have_fourteen_days_of_history(admin):
    s = client_for(admin).get("/api/admin/stats/").json()
    assert len(s["per_day"]) == 14
    assert s["avg_resolution_hours"] is None
    assert s["sla"] == {"open": 0, "overdue": 0, "complianceRate": None}


def test_stats_survive_a_sla_service_outage(admin, monkeypatch):
    from tickets import sla_client
    monkeypatch.setattr(sla_client, "_get", lambda path: (None, None))
    r = client_for(admin).get("/api/admin/stats/")
    assert r.status_code == 200 and r.json()["sla"] is None


def test_users_list_shows_who_is_busy(awa, kone, traore, admin):
    create_ticket(awa)
    rows = {u["username"]: u for u in client_for(admin).get("/api/admin/users/").json()}
    busy = [name for name in ("kone", "traore") if rows[name]["busy"]]
    assert len(busy) == 1
    assert len(rows[busy[0]]["current_tickets"]) == 1
    assert rows["awa"]["created_count"] == 1 and rows["awa"]["busy"] is False


def test_activity_lists_who_did_what(awa, kone, admin):
    t = create_ticket(awa)
    client_for(kone).post(f"/api/tickets/{t['id']}/resolve/")
    events = client_for(admin).get("/api/admin/activity/").json()
    pairs = {(e["actor"], e["event_type"]) for e in events}
    assert {("awa", "CREATED"), ("kone", "ASSIGNED"), ("kone", "RESOLVED")} <= pairs


# --- Espace technicien -------------------------------------------------------------------------

def test_technician_stats_when_busy(awa, bob, kone):
    t = create_ticket(awa, "Écran noir")
    create_ticket(bob)  # en attente
    s = client_for(kone).get("/api/technician/stats/").json()
    assert s["busy"] is True
    assert s["current_ticket"]["id"] == t["id"]
    assert s["waiting_count"] == 1
    assert len(s["per_day"]) == 14


def test_technician_stats_after_resolving(awa, kone):
    t = create_ticket(awa)
    client_for(kone).post(f"/api/tickets/{t['id']}/resolve/")
    s = client_for(kone).get("/api/technician/stats/").json()
    assert s["busy"] is False and s["current_ticket"] is None
    assert s["resolved_total"] == 1 and s["resolved_today"] == 1


def test_technician_stats_are_forbidden_to_users(awa):
    assert client_for(awa).get("/api/technician/stats/").status_code == 403


def test_mine_lists_my_tickets_only(awa, bob, kone, traore):
    create_ticket(awa)
    create_ticket(bob)
    mine = client_for(kone).get("/api/tickets/mine/").json()
    assert len(mine) == 1 and mine[0]["assigned_to_id"] == kone.id
    assert client_for(awa).get("/api/tickets/mine/").status_code == 403
