from django.utils import timezone
from django.db.models import Q
from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User

from .dispatch import dispatch_waiting
from .models import Ticket, TicketEvent
from .notifications import notify_commented, notify_resolved
from .permissions import IsAdminRole, IsStaffRole
from .serializers import CommentSerializer, TicketSerializer
from .sla_client import (
    fetch_stats,
    fetch_ticket_sla,
    notify_ticket_created,
    notify_ticket_resolved,
)


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    http_method_names = ["get", "post", "head", "options"]  # pas de PUT/DELETE

    def get_queryset(self):
        """Un ticket est un échange privé entre son auteur et le technicien assigné.

        Seul l'administrateur voit tous les tickets. Cette règle s'applique à toutes les
        actions qui passent par get_object() : lecture, commentaires, SLA, résolution.
        """
        user = self.request.user
        if user.role == User.Role.ADMIN:
            return Ticket.objects.all()
        return Ticket.objects.filter(Q(created_by=user) | Q(assigned_to=user))

    def perform_create(self, serializer):
        # Le créateur est l'utilisateur connecté, pas une valeur envoyée.
        ticket = serializer.save(created_by=self.request.user)
        TicketEvent.objects.create(
            ticket=ticket, actor=self.request.user,
            event_type=TicketEvent.Type.CREATED,
        )
        notify_ticket_created(ticket)
        # S'il y a un technicien libre, le ticket lui est attribué tout de suite ;
        # sinon il reste en attente. On recharge pour renvoyer l'état à jour.
        dispatch_waiting()
        ticket.refresh_from_db()

    @action(detail=False, methods=["get"], permission_classes=[IsStaffRole])
    def mine(self, request):
        """Les tickets assignés au technicien connecté (en cours et historique)."""
        tickets = Ticket.objects.filter(assigned_to=request.user)
        return Response(self.get_serializer(tickets, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[IsStaffRole])
    def resolve(self, request, pk=None):
        """Le technicien confirme la résolution : il redevient disponible.

        Seul le technicien assigné (ou un administrateur) peut le faire.
        """
        ticket = self.get_object()
        if ticket.status != Ticket.Status.IN_PROGRESS:
            return Response(
                {"detail": "Seul un ticket en cours peut être résolu."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request.user.role != User.Role.ADMIN and ticket.assigned_to_id != request.user.id:
            return Response(
                {"detail": "Ce ticket est assigné à un autre technicien."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ticket.status = Ticket.Status.RESOLVED
        ticket.resolved_at = timezone.now()
        ticket.save()
        TicketEvent.objects.create(
            ticket=ticket, actor=request.user,
            event_type=TicketEvent.Type.RESOLVED,
        )
        notify_ticket_resolved(ticket)
        notify_resolved(ticket, actor=request.user)
        # Le technicien est libre : on lui donne (ou à un autre) le prochain ticket en attente.
        dispatch_waiting()
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["get"])
    def sla(self, request, pk=None):
        """Délai de résolution du ticket, lu auprès du service SLA.

        Passer par Django évite d'exposer la clé API du service SLA au navigateur,
        et get_object() réutilise la règle « un utilisateur ne voit que ses tickets ».
        """
        ticket = self.get_object()
        code, data = fetch_ticket_sla(ticket.id)
        if code is None:
            return Response(
                {"detail": "Service SLA indisponible."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if code == 404:
            # Ticket sans suivi SLA (créé avant l'intégration) : ce n'est pas une erreur,
            # on répond « rien » plutôt que 404 pour ne pas polluer les logs.
            return JsonResponse(None, safe=False)  # corps JSON « null » (Response(None) enverrait un corps vide)
        return Response(data)

    @action(
        detail=False,
        methods=["get"],
        url_path="sla-stats",
        permission_classes=[IsAdminRole],
    )
    def sla_stats(self, request):
        """Statistiques globales du SLA (administrateur seulement)."""
        code, data = fetch_stats()
        if code != 200:
            return Response(
                {"detail": "Service SLA indisponible."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(data)

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        ticket = self.get_object()
        if request.method == "POST":
            # Seules les parties (auteur, technicien assigné) et l'administrateur commentent.
            is_party = request.user.id in (ticket.created_by_id, ticket.assigned_to_id)
            if not (is_party or request.user.role == User.Role.ADMIN):
                return Response(
                    {"detail": "Seuls l'auteur et le technicien assigné peuvent commenter."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            serializer = CommentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(ticket=ticket, author=request.user)
            TicketEvent.objects.create(
                ticket=ticket, actor=request.user,
                event_type=TicketEvent.Type.COMMENTED,
            )
            notify_commented(ticket, request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(CommentSerializer(ticket.comments.all(), many=True).data)
