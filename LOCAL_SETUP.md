# 🚀 Lancer FocusBrain en local

Guide rapide pour installer et exécuter FocusBrain sur ta machine.

## Prérequis (une seule fois)
- **Node.js 20+** → https://nodejs.org (installe la version "LTS")
- Git → https://git-scm.com
- **Docker Desktop** → https://www.docker.com/products/docker-desktop
  (fournit la base de données PostgreSQL nécessaire à l'inscription/connexion)

> Sans base de données, la page d'accueil s'affiche mais l'**inscription** et la
> **connexion** échouent avec « Erreur serveur ». Docker règle ça automatiquement
> (voir Option A). Tu peux aussi utiliser ta propre PostgreSQL : mets son URL dans
> `backend/.env` (`DATABASE_URL=...`).

## Option A — Démarrage en une commande (recommandé)

```bash
git clone https://github.com/tifaqtarik-creator/focusbrain.git
cd focusbrain
```

**macOS / Linux :**
```bash
chmod +x start.sh
./start.sh
```

**Windows :**
```
start.bat
```
(ou double-clique sur `start.bat` dans l'explorateur de fichiers)

Le script installe tout puis démarre les deux serveurs. Ouvre ensuite :

### 👉 http://localhost:5173

Le script démarre aussi la base de données (via Docker) et applique les
migrations, donc **l'inscription et la connexion fonctionnent directement**.

## Option B — Étapes manuelles

```bash
# 0. Base de données (à la racine du projet)
docker compose up -d            # démarre PostgreSQL sur le port 5432

# Backend (terminal 1)
cd backend
cp .env.example .env            # Windows : copy .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy       # crée les tables dans la base
npm run dev                     # API → http://localhost:3001

# Frontend (terminal 2, garde le terminal 1 ouvert)
cd frontend
cp .env.example .env            # Windows : copy .env.example .env
npm install
npm run dev                     # App → http://localhost:5173
```

> Pas de Docker ? Installe PostgreSQL toi-même, crée une base `focusbrain`, puis
> mets sa connexion dans `backend/.env` (`DATABASE_URL`) avant `prisma migrate deploy`.

## Arrêter
- **Option A (macOS/Linux)** : `Ctrl + C` dans le terminal
- **Option A (Windows)** : ferme les deux fenêtres ouvertes
- **Option B** : `Ctrl + C` dans chaque terminal

## Problèmes fréquents
| Symptôme | Solution |
|----------|----------|
| `node: command not found` | Installe Node.js (lien ci-dessus) et rouvre le terminal |
| `port 3001 already in use` | Change `PORT=3001` dans `backend/.env` |
| Page blanche / erreurs réseau | Vérifie que le **backend** tourne aussi (port 3001) |
| « Erreur serveur » à l'inscription | La base n'est pas démarrée → `docker compose up -d` puis `cd backend && npx prisma migrate deploy` |
| `docker: command not found` | Installe Docker Desktop, ou fournis ta propre `DATABASE_URL` |
