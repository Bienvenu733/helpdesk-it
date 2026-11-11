"""Notifications de l'utilisateur connecté et statistiques de l'espace technicien."""
from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, Ticket, TicketEvent
from .permissions import IsStaffRole

DAYS = 14


class NotificationListView(APIView):
    """Les 30 dernières notifications de l'utilisateur connecté."""

    def get(self, request):
        mine = Notification.objects.filter(recipient=request.user)
        return Response({
            "unread_count": mine.filter(is_read=False).count(),
            "results": [
                {
                    "id": n.id,
                    "message": n.message,
                    "ticket_id": n.ticket_id,
                    "is_read": n.is_read,
                    "created_at": n.created_at,
                }
                for n in mine[:30]
            ],
        })


class NotificationReadView(APIView):
    def post(self, request, pk):
        # get_object_or_404 sur le destinataire : on ne peut pas toucher aux notifications d'un autre.
        n = get_object_or_404(Notification, pk=pk, recipient=request.user)
        n.is_read = True
        n.save(update_fields=["is_read"])
        return Response({"id": n.id, "is_read": True})


class NotificationReadAllView(APIView):
    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked": updated})


class TechnicianStatsView(APIView):
    """Tableau de bord personnel du technicien."""

    permission_classes = [IsStaffRole]

    def get(self, request):
        me = request.user
        events = TicketEvent.objects.filter(actor=me)
        today = timezone.localdate()
        start = today - timedelta(days=DAYS - 1)

        def per_day(event_type):
            return dict(
                events.filter(event_type=event_type, created_at__date__gte=start)
                .annotate(d=TruncDate("created_at")).values_list("d")
                .annotate(n=Count("id")).order_by()
            )

        received, resolved = per_day(TicketEvent.Type.ASSIGNED), per_day(TicketEvent.Type.RESOLVED)
        days = [start + timedelta(days=i) for i in range(DAYS)]

        current = Ticket.objects.filter(
            assigned_to=me, status=Ticket.Status.IN_PROGRESS
        ).first()
        durations = [
            (t.resolved_at - t.created_at).total_seconds() / 3600
            for t in Ticket.objects.filter(assigned_to=me, resolved_at__isnull=False)
        ]

        return Response({
            "busy": current is not None,
            "current_ticket": None if current is None else {
                "id": current.id,
                "title": current.title,
                "description": current.description,
                "priority": current.priority,
                "category": current.category,
                "created_at": current.created_at,
            },
            "resolved_total": events.filter(event_type=TicketEvent.Type.RESOLVED).count(),
            "resolved_today": events.filter(
                event_type=TicketEvent.Type.RESOLVED, created_at__date=today
            ).count(),
            "avg_resolution_hours": round(sum(durations) / len(durations), 1) if durations else None,
            "waiting_count": Ticket.objects.filter(
                status=Ticket.Status.OPEN, assigned_to__isnull=True
            ).count(),
            # « created » = tickets reçus, « resolved » = tickets résolus (même forme que le graphique admin).
            "per_day": [
                {"date": d.isoformat(), "created": received.get(d, 0), "resolved": resolved.get(d, 0)}
                for d in days
            ],
        })
