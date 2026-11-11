"""Vues réservées à l'administrateur : équipe, journal d'activité et statistiques."""
from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User

from .models import Ticket, TicketEvent
from .permissions import IsAdminRole
from .sla_client import fetch_stats

DAYS = 14


def _breakdown(field, choices):
    """Nombre de tickets par valeur d'un champ à choix, y compris les valeurs à 0."""
    counts = dict(
        Ticket.objects.values_list(field).annotate(n=Count("id")).order_by()
    )
    return [
        {"key": key, "label": label, "count": counts.get(key, 0)}
        for key, label in choices
    ]


class AdminStatsView(APIView):
    """Chiffres et séries pour les graphiques du dashboard."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        tickets = Ticket.objects.all()
        technicians = User.objects.filter(role=User.Role.TECHNICIAN, is_active=True)
        busy_ids = set(
            tickets.filter(status=Ticket.Status.IN_PROGRESS, assigned_to__isnull=False)
            .values_list("assigned_to_id", flat=True)
        )

        # Tickets créés / résolus par jour sur les 14 derniers jours (jours sans activité = 0).
        today = timezone.localdate()
        start = today - timedelta(days=DAYS - 1)
        created = dict(
            tickets.filter(created_at__date__gte=start)
            .annotate(d=TruncDate("created_at")).values_list("d")
            .annotate(n=Count("id")).order_by()
        )
        resolved = dict(
            tickets.filter(resolved_at__date__gte=start)
            .annotate(d=TruncDate("resolved_at")).values_list("d")
            .annotate(n=Count("id")).order_by()
        )
        per_day = []
        for i in range(DAYS):
            d = start + timedelta(days=i)
            per_day.append({
                "date": d.isoformat(),
                "created": created.get(d, 0),
                "resolved": resolved.get(d, 0),
            })

        durations = [
            (t.resolved_at - t.created_at).total_seconds() / 3600
            for t in tickets.filter(resolved_at__isnull=False)
        ]

        code, sla = fetch_stats()
        return Response({
            "totals": {
                "total": tickets.count(),
                "waiting": tickets.filter(
                    status=Ticket.Status.OPEN, assigned_to__isnull=True
                ).count(),
                "in_progress": tickets.filter(status=Ticket.Status.IN_PROGRESS).count(),
                "resolved": tickets.filter(status=Ticket.Status.RESOLVED).count(),
                "technicians": technicians.count(),
                "technicians_busy": len(busy_ids & set(technicians.values_list("id", flat=True))),
            },
            "by_priority": _breakdown("priority", Ticket.Priority.choices),
            "by_status": _breakdown("status", Ticket.Status.choices),
            "by_category": _breakdown("category", Ticket.Category.choices),
            "per_day": per_day,
            "avg_resolution_hours": round(sum(durations) / len(durations), 1) if durations else None,
            "sla": sla if code == 200 else None,
        })


class AdminUsersView(APIView):
    """Liste des utilisateurs avec leur charge de travail."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        # Les compteurs sont calculés par la base en une seule requête (pas une par utilisateur).
        users = User.objects.annotate(
            created_count=Count("tickets_created", distinct=True),
            resolved_count=Count(
                "ticket_events",
                filter=Q(ticket_events__event_type=TicketEvent.Type.RESOLVED),
                distinct=True,
            ),
        ).order_by("username")

        # Tickets actuellement en cours, regroupés par technicien.
        current = {}
        in_progress = Ticket.objects.filter(
            status=Ticket.Status.IN_PROGRESS, assigned_to__isnull=False
        )
        for t in in_progress:
            current.setdefault(t.assigned_to_id, []).append(
                {"id": t.id, "title": t.title, "priority": t.priority}
            )

        return Response([
            {
                "id": u.id,
                "username": u.username,
                "role": u.role,
                "created_count": u.created_count,
                "resolved_count": u.resolved_count,
                "busy": u.id in current,
                "current_tickets": current.get(u.id, []),
            }
            for u in users
        ])


class AdminActivityView(APIView):
    """Les 50 dernières actions sur les tickets."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        events = TicketEvent.objects.select_related("actor", "ticket")[:50]
        return Response([
            {
                "id": e.id,
                "actor": e.actor.username,
                "actor_role": e.actor.role,
                "event_type": e.event_type,
                "ticket_id": e.ticket_id,
                "ticket_title": e.ticket.title,
                "created_at": e.created_at,
            }
            for e in events
        ])
