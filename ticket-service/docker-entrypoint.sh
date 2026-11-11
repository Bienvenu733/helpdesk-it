#!/bin/sh
# Démarrage du conteneur Django : base à jour, comptes de démo (optionnel), puis serveur.
set -e

# La base peut mettre quelques secondes à accepter les connexions : on réessaie avant d'abandonner.
attempt=0
until python manage.py migrate --noinput; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "${MIGRATE_RETRIES:-30}" ]; then
        echo "La base reste injoignable après $attempt essais : abandon." >&2
        exit 1
    fi
    echo "Base indisponible, nouvel essai ($attempt/${MIGRATE_RETRIES:-30})..."
    sleep "${MIGRATE_DELAY:-2}"
done

if [ "$SEED_DEMO" = "true" ]; then
    python manage.py seed_demo
fi

# exec : gunicorn devient le processus principal et reçoit proprement les signaux d'arrêt de Docker.
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --access-logfile -
