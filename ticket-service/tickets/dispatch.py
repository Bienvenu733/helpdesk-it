"""Répartition automatique des tickets entre les techniciens.

Règles :
- un technicien traite UN seul ticket à la fois (il est « occupé » tant qu'il
  a un ticket en cours) ;
- un ticket sans technicien disponible reste en attente (statut OUVERT, non assigné) ;
- dès qu'un technicien se libère, ou qu'un ticket arrive, on répartit :
  les tickets les plus urgents d'abord, puis les plus anciens ;
- parmi les techniciens libres, on choisit celui qui a pris le moins de tickets
  (répartition équitable).
"""
from django.db import transaction
from django.db.models import Case, Count, Exists, IntegerField, OuterRef, Q, Value, When

from accounts.models import User

from .models import Ticket, TicketEvent
from .notifications import notify_assigned


def free_technicians():
    busy = Ticket.objects.filter(
        assigned_to=OuterRef("pk"), status=Ticket.Status.IN_PROGRESS
    )
    return (
        User.objects.filter(role=User.Role.TECHNICIAN, is_active=True)
        .annotate(is_busy=Exists(busy))
        .filter(is_busy=False)
        .annotate(
            taken=Count(
                "ticket_events",
                filter=Q(ticket_events__event_type=TicketEvent.Type.ASSIGNED),
            )
        )
        .order_by("taken", "id")
    )


def waiting_tickets():
    rank = Case(
        When(priority=Ticket.Priority.CRITICAL, then=Value(0)),
        When(priority=Ticket.Priority.HIGH, then=Value(1)),
        When(priority=Ticket.Priority.MEDIUM, then=Value(2)),
        default=Value(3),
        output_field=IntegerField(),
    )
    return (
        Ticket.objects.filter(status=Ticket.Status.OPEN, assigned_to__isnull=True)
        .annotate(rank=rank)
        .order_by("rank", "created_at", "id")
    )


@transaction.atomic
def dispatch_waiting():
    """Attribue les tickets en attente aux techniciens libres. Renvoie [(ticket, technicien)]."""
    assignments = []
    for technician, ticket in zip(list(free_technicians()), list(waiting_tickets())):
        ticket.assigned_to = technician
        ticket.status = Ticket.Status.IN_PROGRESS
        ticket.save()
        TicketEvent.objects.create(
            ticket=ticket, actor=technician, event_type=TicketEvent.Type.ASSIGNED
        )
        # Le technicien et l'auteur du ticket sont prévenus.
        notify_assigned(ticket, technician)
        assignments.append((ticket, technician))
    return assignments
