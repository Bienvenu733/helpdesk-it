from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Utilisateur de l'application, avec un rôle."""

    class Role(models.TextChoices):
        USER = "USER", "Utilisateur"
        TECHNICIAN = "TECHNICIAN", "Technicien"
        ADMIN = "ADMIN", "Administrateur"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.USER,
    )

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
