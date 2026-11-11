"""Crée des comptes de démonstration (un par rôle). Idempotent : relançable sans danger.

Le mot de passe vient de la variable d'environnement DEMO_PASSWORD : il n'est jamais écrit
dans le code, donc jamais publié sur GitHub.
"""
import os

from django.core.management.base import BaseCommand, CommandError

from accounts.models import User

DEMO_USERS = [
    ("admin", User.Role.ADMIN),
    ("technicien1", User.Role.TECHNICIAN),
    ("technicien2", User.Role.TECHNICIAN),
    ("utilisateur", User.Role.USER),
]


class Command(BaseCommand):
    help = "Crée les comptes de démonstration (admin, deux techniciens, un utilisateur)."

    def handle(self, *args, **options):
        password = os.environ.get("DEMO_PASSWORD", "")
        if len(password) < 8:
            raise CommandError("DEMO_PASSWORD doit être défini (8 caractères minimum).")

        for username, role in DEMO_USERS:
            user, created = User.objects.get_or_create(username=username, defaults={"role": role})
            if created:
                user.set_password(password)
                user.is_staff = user.is_superuser = role == User.Role.ADMIN
                user.save()
            self.stdout.write(f"{'créé' if created else 'déjà là'} : {username} ({role})")
