#!/bin/sh
# Démarrage du conteneur Django : base à jour, comptes de démo (optionnel), puis serveur.
set -e

python manage.py migrate --noinput

if [ "$SEED_DEMO" = "true" ]; then
    python manage.py seed_demo
fi

# exec : gunicorn devient le processus principal et reçoit proprement les signaux d'arrêt de Docker.
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --access-logfile -
