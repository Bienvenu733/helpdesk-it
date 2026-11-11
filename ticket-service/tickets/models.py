from django.conf import settings
from django.db import models


class Ticket(models.Model):
    class Priority(models.TextChoices):
        CRITICAL = "CRITICAL", "Critique"
        HIGH = "HIGH", "Haute"
        MEDIUM = "MEDIUM", "Moyenne"
        LOW = "LOW", "Basse"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Ouvert"
        IN_PROGRESS = "IN_PROGRESS", "En cours"
        RESOLVED = "RESOLVED", "Résolu"
        CLOSED = "CLOSED", "Clôturé"

    class Category(models.TextChoices):
        HARDWARE = "HARDWARE", "Matériel"
        NETWORK = "NETWORK", "Réseau"
        SOFTWARE = "SOFTWARE", "Logiciel"
        ACCESS = "ACCESS", "Compte et accès"
        OTHER = "OTHER", "Autre"

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(
        max_length=10, choices=Category.choices, default=Category.OTHER
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.OPEN
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="tickets_created",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets_assigned",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"#{self.pk} {self.title} [{self.get_status_display()}]"


class TicketEvent(models.Model):
    """Journal d'activité : qui a fait quoi sur quel ticket, et quand."""

    class Type(models.TextChoices):
        CREATED = "CREATED", "Création"
        ASSIGNED = "ASSIGNED", "Prise en charge"
        RESOLVED = "RESOLVED", "Résolution"
        COMMENTED = "COMMENTED", "Commentaire"

    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name="events"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_events",
    )
    event_type = models.CharField(max_length=15, choices=Type.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.actor} : {self.get_event_type_display()} sur #{self.ticket_id}"


class Notification(models.Model):
    """Message adressé à un utilisateur (ex. : un ticket vient de lui être attribué)."""

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name="notifications"
    )
    message = models.CharField(max_length=300)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Pour {self.recipient} : {self.message}"


class Comment(models.Model):
    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Commentaire de {self.author} sur le ticket #{self.ticket_id}"
