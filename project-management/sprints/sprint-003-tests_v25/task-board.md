# Task Board — Sprint 003 : Tests & Qualité V2.5

> Dernière mise à jour : 2026-06-16
> Sprint Goal : "Atteindre une couverture de tests ≥80% sur desktop et mobile pour sécuriser les évolutions futures."

## Kanban

### 🔲 À faire

#### US-011 : Tests Mobile (Jest + RNTL) — 8 pts
| ID | Type | Tâche | Est. |
|----|------|-------|------|
| T-011-01 | [OPS] | Setup Jest + RNTL + mocks natifs | 1.5h |
| T-011-02 | [OPS] | Setup MSW (mock API) | 0.5h |
| T-011-03 | [TEST] | Tests lib/storage.ts (expo-secure-store) | 1h |
| T-011-04 | [TEST] | Tests lib/auth.ts (Google OAuth) | 1h |
| T-011-05 | [TEST] | Tests lib/api.ts | 1h |
| T-011-06 | [TEST] | Tests lib/format.ts + lib/ai.ts | 0.5h |
| T-011-07 | [TEST] | Tests hooks (useLocalEvents, useTimeTracking) | 1.5h |
| T-011-08 | [TEST] | Tests screens (Settings, Calendar, Tasks) | 2h |
| T-011-09 | [TEST] | Tests composants UI (QuickAdd, ui.tsx) | 1h |
| T-011-10 | [OPS] | CI GitHub Actions — mobile tests + coverage 80% | 0.5h |
| T-011-11 | [DOC] | npm scripts test dans package.json | 0.25h |

### 🔄 En cours

_Aucune_

### 👀 Review

_Aucune_

### ✅ Done

#### US-010 : Tests Desktop (Vitest + RTL) — 8 pts ✅
| ID | Type | Tâche | Est. | Réel |
|----|------|-------|------|------|
| T-010-01 | [OPS] | Setup Vitest 4.1.9 + RTL + jsdom | 1h | ✅ |
| T-010-02 | [OPS] | Setup MSW + coverage-v8 | 0.5h | ✅ |
| T-010-03 | [TEST] | Tests lib/storage.ts | 1.5h | ✅ |
| T-010-04 | [TEST] | Tests lib/auth.ts + secure-storage | 1h | ✅ |
| T-010-05 | [TEST] | Tests lib/api.ts | 1h | ✅ |
| T-010-06 | [TEST] | Tests lib/notifications.ts + theme.ts | 1h | ✅ |
| T-010-07 | [TEST] | Tests 7 hooks | 2h | ✅ |
| T-010-08 | [TEST] | Tests 9 composants | 2h | ✅ |
| T-010-09 | [OPS] | CI GitHub Actions — test-desktop + coverage 80% | 0.5h | ✅ |
| T-010-10 | [DOC] | npm scripts test dans package.json | 0.25h | ✅ |

### 🚫 Bloqué

_Aucune_

---

## Résumé

| Statut | Tâches | Heures est. |
|--------|--------|-------------|
| 🔲 À faire | 11 (US-011) | ~10.75h |
| ✅ Done | 10 (US-010) | ~10.75h |
| **Total** | **21** | **~21.5h** |

## Points

| US | Points | Statut |
|----|--------|--------|
| US-010 | 8 | ✅ Done |
| US-011 | 8 | 🔲 À faire |
| **Total** | **8/16** | 50% |

## Coverage Desktop (US-010)

| Métrique | Résultat | Seuil |
|----------|----------|-------|
| Statements | 85.01% | 80% ✅ |
| Branches | 78.90% | 75% ✅ |
| Functions | 83.76% | 80% ✅ |
| Lines | 85.97% | 80% ✅ |

**327 tests — 22 fichiers — CI verte 4/4**
