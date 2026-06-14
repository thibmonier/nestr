# @nestr/mobile

App mobile Nestr (Expo / React Native). Réutilise `@nestr/core` (moteur
d'ordonnancement) et parle au Worker Cloudflare de production.

## Lancer

```bash
npm install                 # à la racine du monorepo
npm run build:core          # @nestr/core doit être buildé (dist/)
npm run start -w @nestr/mobile   # puis i / a / w (iOS / Android / web)
```

> ⚠️ **Node 20 requis pour le CLI Expo.** Node ≥ 22.18 active le
> *type-stripping* automatique qui casse `expo` (`expo-modules-core` est
> distribué en `.ts`). Utilise `nvm use 20` avant de lancer Expo.
> Le bundling de l'app (Metro/Babel) fonctionne quelle que soit la version.

## Architecture

- `App.tsx` — racine : thème, gate d'auth Google, navigation par onglets
  (Tâches / Plan / Réglages).
- `src/lib/` — `api` (session SecureStore natif / localStorage web + fetch
  Bearer), `auth` (Google via `expo-web-browser` + deep-link `nestr://auth`),
  `ai`, `calendars`, `sync`, `storage` (cache AsyncStorage), `format`.
- `src/screens/` — `TasksScreen`, `PlanScreen` (`scheduleDay` local),
  `SettingsScreen` (clé IA per-user), `TaskModal`.
- `src/theme.tsx` — palette portée du design system desktop (clair/sombre).

## Auth

Connexion Google uniquement (= inscription). Le Worker ouvre l'auth Google,
puis redirige le token sur `nestr://auth?token=…`. Le scheme `nestr://` est
validé côté Worker (`isAppRedirect`, `services/api/src/index.ts`).

## IA

Clé API **par utilisateur** (Anthropic ou OpenAI), saisie dans Réglages →
`POST /me/ai` (chiffrée côté serveur). Les fonctions IA sont désactivées tant
qu'aucune clé n'est configurée (`aiConfigured`).
