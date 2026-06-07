#!/usr/bin/env bash
# FocusBrain — démarrage local en une commande (macOS / Linux)
# Usage : ./start.sh
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "🧠 FocusBrain — installation & démarrage local"
echo "----------------------------------------------"

# 1. Vérifie Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js n'est pas installé. Installe Node 20+ depuis https://nodejs.org puis relance ce script."
  exit 1
fi
echo "✅ Node $(node --version) détecté"

# 2. Fichiers .env (créés depuis les exemples s'ils n'existent pas)
[ -f backend/.env ]  || { cp backend/.env.example backend/.env;   echo "✅ backend/.env créé"; }
[ -f frontend/.env ] || { cp frontend/.env.example frontend/.env; echo "✅ frontend/.env créé"; }

# 3. Base de données (Docker si dispo) + migrations
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "🐘 Démarrage de PostgreSQL via Docker..."
  docker compose up -d db
  echo "   ⏳ Attente que la base soit prête..."
  for i in $(seq 1 30); do
    docker compose exec -T db pg_isready -U user -d focusbrain >/dev/null 2>&1 && break
    sleep 1
  done
  DB_READY=1
else
  echo "⚠️  Docker introuvable : la base de données ne sera pas démarrée."
  echo "    L'application s'ouvrira, mais l'inscription/connexion afficheront 'Erreur serveur'."
  echo "    Installe Docker Desktop (https://docker.com) puis relance, ou fournis ta propre"
  echo "    DATABASE_URL dans backend/.env."
  DB_READY=0
fi

# 4. Dépendances backend + client Prisma
echo "📦 Installation backend..."
( cd backend && npm install && npx prisma generate )

# Applique le schéma à la base si elle est prête
if [ "$DB_READY" = "1" ]; then
  echo "🗄️  Application des migrations Prisma..."
  ( cd backend && npx prisma migrate deploy )
fi

# 5. Dépendances frontend
echo "📦 Installation frontend..."
( cd frontend && npm install )

# 6. Démarrage des deux serveurs ; Ctrl+C arrête les deux
echo "🚀 Démarrage des serveurs (Ctrl+C pour tout arrêter)..."
cleanup() { echo; echo "🛑 Arrêt..."; kill 0 2>/dev/null; }
trap cleanup EXIT INT TERM

( cd backend  && npm run dev ) &
( cd frontend && npm run dev ) &

sleep 4
echo
echo "✅ Application prête !  Ouvre 👉  http://localhost:5173"
echo "   (API backend sur http://localhost:3001)"
wait
