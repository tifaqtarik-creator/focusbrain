# FocusBrain 🧠

**Plateforme de Body Doubling pour adultes TDAH**

> Neurodivergent-First | Body Doubling Clinique | Evidence-Based

---

## Concept

FocusBrain est la première plateforme de Body Doubling conçue **exclusivement** pour les adultes TDAH. Chaque décision de conception est basée sur les spécificités neurologiques du TDAH.

### Pourquoi le Body Doubling fonctionne

Le Body Doubling réduit le temps de démarrage d'une tâche de **40 à 60%** chez les personnes TDAH via 3 mécanismes :
- Activation dopaminergique par la présence sociale
- Régulation de l'attention par le regard
- Ancrage temporel externe (combat la "time blindness")

---

## Stack Technique

### Frontend
- React 18 + TypeScript + Vite
- TailwindCSS + Radix UI (WCAG 2.1 AA)
- Framer Motion (respect `prefers-reduced-motion`)
- Zustand (state client)
- React Query (TanStack)
- Socket.io Client

### Backend
- Node.js 20 LTS + Express + TypeScript
- Socket.io (matching temps réel, timer sync)
- Prisma ORM + PostgreSQL 15
- Redis (Upstash) — cache & rate limiting
- JWT + Refresh Tokens

### Services Tiers
- **Daily.co** — vidéo WebRTC P2P
- **Stripe** — abonnements Premium/Teams
- **Resend** — emails transactionnels
- **Cloudflare R2** — stockage médias
- **Sentry** — monitoring erreurs

---

## Structure du Projet

```
focusbrain/
├── frontend/          # React SPA
│   └── src/
│       ├── components/
│       │   ├── ui/        # Design system TDAH-Safe
│       │   ├── auth/      # Inscription 2 étapes
│       │   ├── dashboard/ # 1 bouton principal
│       │   ├── session/   # Salle Body Doubling
│       │   └── layout/
│       ├── pages/
│       ├── stores/        # Zustand (Low Stim mode)
│       ├── hooks/
│       └── lib/
└── backend/           # Express API
    ├── src/
    │   ├── routes/
    │   ├── middleware/
    │   ├── socket/        # Matching temps réel
    │   └── services/      # Matching TDAH-aware, badges
    └── prisma/
        └── schema.prisma  # Schéma complet
```

---

## Installation

### Prérequis
- Node.js 20+
- PostgreSQL 15+
- Redis

### Setup

```bash
# Clone
git clone https://github.com/tifaqtarik-creator/focusbrain.git
cd focusbrain

# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev

# Frontend (nouveau terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

---

## Variables d'Environnement

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/focusbrain"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
DAILY_API_KEY="your-daily-co-key"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
RESEND_API_KEY="re_..."
FRONTEND_URL="http://localhost:5173"
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL="http://localhost:3001"
VITE_SOCKET_URL="http://localhost:3001"
VITE_DAILY_DOMAIN="your-domain.daily.co"
VITE_STRIPE_PUBLIC_KEY="pk_test_..."
```

---

## Modules Fonctionnels

| Module | Statut |
|--------|--------|
| Authentification TDAH-Safe (2 étapes, <90s) | Phase 1 |
| Dashboard 1 bouton | Phase 1 |
| Matching TDAH-aware (WebSocket) | Phase 2 |
| Salle de session (Daily.co + timer sync) | Phase 2 |
| Mode Solo (avatar animé fallback) | Phase 2 |
| Task Paralysis Rescue | Phase 2 |
| Profil + badges TDAH-affirmatifs | Phase 3 |
| Cercle de Confiance | Phase 3 |
| Forum communautaire TDAH | Phase 3 |
| Stripe Premium/Teams | Phase 4 |
| Annuaire coachs TDAH | Phase 4 |

---

## Principes UX Non-Négociables

1. **Un seul CTA visible** — zéro paralysie du choix
2. **Zéro friction onboarding** — première session en <2 minutes
3. **Notifications uniquement utiles** — zéro culpabilisation
4. **Mode Low Stim** — activable depuis n'importe quelle page en 1 clic
5. **Métriques uniquement positives** — pas de streaks qui cassent
6. **Langage TDAH-affirmatif** — "ton cerveau TDAH" pas "tes difficultés"

---

## Plans Tarifaires

| Fonctionnalité | Gratuit | Premium (9€/mois) |
|----------------|---------|-------------------|
| Sessions/semaine | 3 max | Illimitées |
| Durée session | 25 min | 15/25/50/75 min |
| Quiet Mode | ❌ | ✅ |
| Cercle de Confiance | 1 partenaire | 5 partenaires |
| Bruits de fond TDAH | 1 option | 10 options |
| Task Paralysis Rescue | ❌ | ✅ |
| Historique | 30 jours | Complet |

---

## RGPD & Sécurité

Les données TDAH sont des **données de santé spéciales** (Art. 9 RGPD) :
- Chiffrement supplémentaire en base pour les champs sensibles
- Jamais partagées avec des tiers ou annonceurs
- Droit à l'oubli : suppression complète sous 72h
- Sessions vidéo P2P via Daily.co — jamais enregistrées

---

## Planning MVP (14 semaines)

- **Phase 1** (S1-3) : Fondations TDAH-Safe, auth, design system
- **Phase 2** (S4-7) : Core Body Doubling, matching, vidéo, timer
- **Phase 3** (S8-11) : Engagement, communauté, badges
- **Phase 4** (S12-14) : Monétisation, coachs, lancement beta

---

*Document confidentiel — FocusBrain v1.0 — Juin 2026*
