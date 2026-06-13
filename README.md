# Nestr

Assistant de planification quotidienne piloté par IA. Tu saisis tes tâches au fil de l'eau, Nestr agrège tes calendriers (Google, Apple) et te propose un **plan d'action du jour optimisé** : ordonnancement dans les créneaux libres, estimations de durée, et découpage des grosses tâches.

## Architecture (monorepo npm workspaces)

```
packages/core/   Domaine + moteur de planification (TypeScript, sans UI, testé)
apps/desktop/    Application desktop — Tauri + React + Vite + Tailwind
apps/mobile/     Application mobile — Expo / React Native (à venir, Phase 5)
services/api/    Backend Cloudflare Worker — OAuth Google, CalDAV Apple, proxy Claude (Phase 2-3)
```

Le **moteur** (`@nestr/core`) est déterministe et testé : il calcule les créneaux libres à partir de l'agenda, priorise les tâches (priorité + urgence d'échéance) et les place au mieux (respect du moment préféré et de la fenêtre haute énergie). L'**IA Claude** raffine ensuite ce socle (estimations, découpage, conseils) — branchée via le Worker pour ne jamais exposer la clé Anthropic.

## Feuille de route

- [x] **Phase 1 — Fondations** : monorepo, moteur testé, app desktop
- [x] **Phase 2 — IA** : Worker proxy Claude (estimation, découpage, conseils)
- [x] **Phase 3 — Calendriers** : OAuth Google + CalDAV Apple, créneaux libres réels
- [x] **Phase 4 — Comptes & sync** : Google Sign-In, D1, sync multi-appareils, tokens chiffrés
- [ ] **Revue UX/UI** : optimisation des interfaces avant packaging natif
- [ ] **Tauri natif** : build desktop packagé (.app/.dmg)
- [ ] **Phase 5 — Mobile** : app Expo réutilisant `@nestr/core`

Fonctions transverses : échéances, jours autorisés et **contexte** (pro/perso/personnalisé) par tâche ; **plages de disponibilité** configurables par jour (éditeur de réglages) ; planification **journée** ou **semaine** ; provenance des événements (Google/Apple + nom du calendrier).

## Démarrer

Prérequis : Node ≥ 20, Rust (`rustup default stable`) pour le build desktop natif.

```bash
npm install
npm run build:core      # compile le moteur partagé
npm test                # tests du moteur

# App desktop en mode web (rapide)
npm run desktop         # http://localhost:1420

# Backend (Worker + D1)
npm run api:dev         # http://localhost:8787

# App desktop native (Tauri — compile Rust au 1er lancement, ~2 Go)
npm run desktop:tauri
```

### Backend : secrets et D1

Crée `services/api/.dev.vars` (gitignoré) :

```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback
ENCRYPTION_KEY=<base64 de 32 octets aléatoires>
```

Initialise la base D1 locale, puis lance le Worker :

```bash
cd services/api
wrangler d1 execute DB --local --file schema.sql   # crée les tables (local)
wrangler dev --port 8787
```

En production : `wrangler d1 create nestr` (renseigner l'`database_id` dans
`wrangler.jsonc`), appliquer `schema.sql` en remote, puis
`wrangler secret put` pour chaque secret. Les identifiants Apple ne sont plus
des secrets serveur : chaque utilisateur les saisit dans **Réglages**, ils sont
chiffrés (AES-GCM) et stockés en D1.

## Données & confidentialité

Connexion par **Google Sign-In**. Tâches et préférences synchronisées via D1
(cache local `localStorage` pour le hors-ligne). Les jetons calendrier (refresh
Google, mot de passe d'application Apple) sont **chiffrés au repos** et ne
transitent jamais vers le front : le Worker est le seul à les déchiffrer.
