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

- [x] **Phase 1 — Fondations** : monorepo, moteur testé, app desktop fonctionnelle (stockage local)
- [ ] **Phase 2 — IA** : Worker proxy Claude, estimation + découpage + génération de plan
- [ ] **Phase 3 — Calendriers** : OAuth Google + CalDAV Apple, créneaux libres réels
- [ ] **Phase 4 — Persistance & sync** : D1, comptes, multi-appareils
- [ ] **Phase 5 — Mobile** : app Expo réutilisant `@nestr/core`

## Démarrer

Prérequis : Node ≥ 20, Rust (`rustup default stable`) pour le build desktop natif.

```bash
npm install
npm run build:core      # compile le moteur partagé
npm test                # tests du moteur

# App desktop en mode web (rapide)
npm run desktop         # http://localhost:1420

# App desktop native (Tauri — compile Rust au 1er lancement, ~2 Go)
npm run desktop:tauri
```

## État Phase 1

Le moteur place les tâches dans la journée selon priorité, échéance, énergie et moment préféré, en réservant des pauses. Les calendriers ne sont pas encore branchés : la planification suppose pour l'instant un agenda vide (Phase 3). Les tâches sont stockées localement (`localStorage`).
