# 🚀 Lancer FocusBrain en local

Guide rapide pour installer et exécuter FocusBrain sur ta machine.

## Prérequis (une seule fois)
- **Node.js 20+** → https://nodejs.org (installe la version "LTS")
- Git → https://git-scm.com

> PostgreSQL/Redis ne sont **pas** nécessaires pour ouvrir l'application.
> Ils ne deviennent utiles que pour les fonctionnalités qui sauvegardent des
> données (inscription, connexion, sessions).

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

## Option B — Étapes manuelles

```bash
# Backend (terminal 1)
cd backend
cp .env.example .env        # Windows : copy .env.example .env
npm install
npx prisma generate
npm run dev                 # API → http://localhost:3001

# Frontend (terminal 2, garde le terminal 1 ouvert)
cd frontend
cp .env.example .env        # Windows : copy .env.example .env
npm install
npm run dev                 # App → http://localhost:5173
```

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
| L'inscription/connexion échoue | Normal sans base de données — il faut PostgreSQL + `npx prisma migrate dev` |
