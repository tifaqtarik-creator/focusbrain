# 🚀 Déploiement de FocusBrain

FocusBrain est une application **full-stack** :

| Partie | Techno | Où l'héberger |
|--------|--------|---------------|
| **Frontend** (React/Vite) | fichiers statiques | **GitHub Pages** |
| **Backend** (Express + WebSocket) | Node, processus permanent | **Render** (ou Railway/Fly.io) |
| **Base de données** | PostgreSQL | **Render** (incluse) |

> ⚠️ GitHub Pages **ne peut pas** faire tourner le backend. Le frontend seul s'affiche mais
> rien ne fonctionne tant que le backend n'est pas en ligne. Déployez **le backend d'abord**.

---

## Étape 1 — Backend + base de données sur Render

1. Créez un compte sur **https://render.com** (gratuit, connexion via GitHub).
2. **New → Blueprint** → sélectionnez le dépôt `tifaqtarik-creator/focusbrain`.
3. Render lit `render.yaml` et propose de créer **focusbrain-api** + **focusbrain-db**. Cliquez **Apply**.
4. Le build s'exécute (`prisma generate`, `tsc`, `migrate deploy`). Patientez ~3-5 min.
5. Notez l'URL publique du service, par ex. `https://focusbrain-api.onrender.com`.
6. Dans **focusbrain-api → Environment**, renseignez :
   - `BACKEND_URL` = `https://focusbrain-api.onrender.com` (sert les avatars uploadés)
   - *(optionnel, visio)* `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   - Vérifiez que `EXTRA_ORIGINS` = `https://tifaqtarik-creator.github.io`
7. **Manual Deploy → Deploy latest commit** pour reprendre les nouvelles variables.
8. Test : ouvrez `https://focusbrain-api.onrender.com/health` → doit afficher `{"status":"ok"}`.

> 💡 Plan gratuit : le service s'endort après inactivité (1er appel ~30 s) et la base
> gratuite expire après 30 jours. Pour de la prod durable, passez en plan payant.

---

## Étape 2 — Frontend sur GitHub Pages

1. Sur GitHub : **Settings → Pages → Build and deployment → Source = GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret**, ajoutez :
   - `VITE_API_URL` = `https://focusbrain-api.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://focusbrain-api.onrender.com`
   - `VITE_MAPTILER_KEY` = votre clé MapTiler *(optionnel, pour la carte des membres)*
3. Lancez le déploiement : **Actions → « Deploy frontend to GitHub Pages » → Run workflow**
   (ou poussez un commit touchant `frontend/`).
4. Une fois le workflow vert, le site est en ligne :
   **https://tifaqtarik-creator.github.io/focusbrain/**

---

## Étape 3 — Vérification

1. Ouvrez `https://tifaqtarik-creator.github.io/focusbrain/`.
2. Créez un compte → connexion → le calendrier des sessions se charge.
3. Si une erreur réseau apparaît : vérifiez que `VITE_API_URL` pointe bien vers Render
   et que `EXTRA_ORIGINS` (Render) contient l'origine GitHub Pages.

---

## Récapitulatif des variables

### Backend (Render)
| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | auto (base Render) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | auto-générés |
| `FRONTEND_URL` | `https://tifaqtarik-creator.github.io` |
| `EXTRA_ORIGINS` | `https://tifaqtarik-creator.github.io` |
| `BACKEND_URL` | URL Render du service |
| `LIVEKIT_*` | optionnel (visio) |

### Frontend (secrets GitHub Actions)
| Secret | Valeur |
|--------|--------|
| `VITE_API_URL` | `https://<render>.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://<render>.onrender.com` |
| `VITE_MAPTILER_KEY` | votre clé MapTiler (optionnel) |

---

## Notes

- **Sécurité** : ne committez jamais les fichiers `.env` (déjà ignorés par `.gitignore`).
  Pensez à renouveler tout jeton GitHub (PAT) stocké en clair dans `.git/config`.
- **Alternative au backend Render** : Railway ou Fly.io fonctionnent aussi (mêmes commandes
  `prisma migrate deploy` + `node dist/index.js`).
- **Alternative au frontend Pages** : Vercel/Netlify gèrent nativement le routage SPA
  (pas besoin de `404.html`) et sont souvent plus simples.
