#!/usr/bin/env bash
# Génère un fichier .env avec des secrets aléatoires (mots de passe, clés).
#   ./scripts/make-env.sh            -> crée .env
#   ./scripts/make-env.sh autre.env  -> crée ce fichier
# Refuse d'écraser un fichier existant : vos secrets ne sont jamais perdus par accident.
set -euo pipefail

target="${1:-.env}"
if [ -e "$target" ]; then
    echo "Le fichier $target existe déjà : rien n'a été modifié." >&2
    exit 1
fi

# 'openssl rand' est présent partout (Linux, macOS, runners GitHub).
secret() { openssl rand -base64 "$1" | tr -d '/+=\n' | cut -c1-"$2"; }

umask 077   # fichier lisible par vous seul
cat > "$target" <<EOF
POSTGRES_DB=helpdesk
POSTGRES_USER=helpdesk
POSTGRES_PASSWORD=$(secret 24 24)
ORACLE_PASSWORD=$(secret 24 24)
SLA_DB_PASSWORD=$(secret 24 24)
DJANGO_SECRET_KEY=$(secret 48 64)
SLA_API_KEY=$(secret 32 40)
SEED_DEMO=true
DEMO_PASSWORD=$(secret 18 16)
FRONTEND_PORT=3000
DJANGO_PORT=8000
SLA_PORT=8081
POSTGRES_HOST_PORT=5432
ORACLE_HOST_PORT=1521
PUBLIC_API_URL=http://localhost:8000/api
PUBLIC_FRONTEND_URL=http://localhost:3000
EOF
echo "Créé : $target (mot de passe des comptes de démo : voir DEMO_PASSWORD)"
