# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Security

- **CORS whitelist** (US-003): Remplacé le wildcard `cors()` par une whitelist stricte d'origines (Tauri localhost + dev server)
- **IDs cryptographiques** (US-005): Supprimé le fallback `Math.random()` dans la génération d'identifiants mobile — utilise `expo-crypto.randomUUID()` exclusivement
- **Rate limiting** (US-004): Règles WAF Cloudflare configurées (100 req/min général, 10 req/min IA, 5 req/min auth)
- **Session cleanup** (US-006): Cron quotidien (03:00 UTC) supprime les sessions expirées via handler `scheduled()` + D1 batch delete
- **Stockage chiffré desktop** (US-001): Migration `localStorage` → Tauri Store plugin avec migration automatique one-shot
- **Stockage chiffré mobile** (US-002): Déjà implémenté (`expo-secure-store` pour tokens session)

### Changed

- Upgrade vitest 2.x → 3.x (support vite 6)
- Ajout `.nvmrc` (Node 20)
- Ajout CI GitHub Actions (typecheck + tests)
- Export Worker modifié : `{ fetch, scheduled }` au lieu de `app` directement
