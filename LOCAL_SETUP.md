# 🚀 Lancer FocusBrain en local

Guide rapide pour installer et exécuter FocusBrain sur ta machine.

## Prérequis (une seule fois)
- **Node.js 20+** → https://nodejs.org (installe la version "LTS")
- Git → https://git-scm.com
- **Une base PostgreSQL** (au choix) :
  - **PostgreSQL natif** → https://www.postgresql.org/download/windows/
    (voir la section « Installer PostgreSQL nativement » plus bas)
  - *ou* **Docker Desktop** → https://www.docker.com/products/docker-desktop
    (le script démarre alors la base automatiquement)

> Sans base de données, la page d'accueil s'affiche mais l'**inscription** et la
> **connexion** échouent avec « Erreur serveur ». Le script `start` applique les
> migrations dès qu'une base est joignable sur `localhost:5432`.

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

> Pas de Docker ? Installe PostgreSQL toi-même (voir ci-dessous).

## Installer PostgreSQL nativement (Windows, sans Docker)

1. **Télécharge** l'installeur PostgreSQL 16 :
   https://www.postgresql.org/download/windows/ → bouton *Download the installer*.
2. **Lance l'installeur** et clique « Next » jusqu'au bout :
   - Quand on demande un **mot de passe pour l'utilisateur `postgres`**, mets quelque
     chose dont tu te souviendras (par ex. `password`).
   - Laisse le **port** sur `5432`.
   - Tu peux décocher « Stack Builder » à la fin.
3. Ouvre **« SQL Shell (psql) »** depuis le menu Démarrer. Appuie sur Entrée pour
   accepter les valeurs par défaut (Server, Database, Port, Username `postgres`),
   puis saisis le mot de passe choisi à l'étape 2.
4. **Crée le rôle et la base** attendus par l'application (copie-colle ces 2 lignes) :
   ```sql
   CREATE ROLE "user" WITH LOGIN PASSWORD 'password' SUPERUSER;
   CREATE DATABASE focusbrain OWNER "user";
   ```
   👉 Ces identifiants correspondent déjà à `backend/.env` — rien d'autre à modifier.
5. **Relance** `start.bat`. Cette fois les migrations s'appliquent et l'inscription
   fonctionne. 🎉

> Si tu préfères utiliser le mot de passe `postgres` au lieu de créer un rôle :
> ouvre `backend/.env` et remplace la ligne `DATABASE_URL` par
> `postgresql://postgres:TON_MOT_DE_PASSE@localhost:5432/focusbrain`,
> crée la base avec `CREATE DATABASE focusbrain;`, puis relance `start.bat`.

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
