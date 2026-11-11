"""Création des notifications : un seul endroit pour décider qui est prévenu, et de quoi."""
from .models import Notification


def notify(recipient, ticket, message, actor=None):
    """Prévient `recipient`. Personne n'est notifié de sa propre action."""
    if recipient is None or recipient == actor:
        return None
    return Notification.objects.create(recipient=recipient, ticket=ticket, message=message)


def notify_assigned(ticket, technician):
    """Un ticket vient d'être attribué : le technicien et l'auteur du ticket sont prévenus."""
    notify(
        technician, ticket,
        f"Le ticket #{ticket.pk} « {ticket.title} » vous a été attribué "
        f"(priorité : {ticket.get_priority_display().lower()}).",
    )
    notify(
        ticket.created_by, ticket,
        f"Votre ticket #{ticket.pk} « {ticket.title} » a été pris en charge par {technician.username}.",
        actor=technician,
    )


def notify_resolved(ticket, actor):
    notify(
        ticket.created_by, ticket,
        f"Votre ticket #{ticket.pk} « {ticket.title} » a été résolu.",
        actor=actor,
    )


def notify_commented(ticket, author):
    """Nouveau commentaire : l'autre partie (auteur du ticket, technicien assigné) est prévenue."""
    message = f"Nouveau commentaire de {author.username} sur le ticket #{ticket.pk} « {ticket.title} »."
    for person in {ticket.created_by, ticket.assigned_to}:
        notify(person, ticket, message, actor=author)
