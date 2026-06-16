# Task Board — Sprint 004 : UX Avancée & Cache IA

> Dernière mise à jour : 2026-06-16
> Sprint Goal : "Livrer le rituel matin/soir et réduire les coûts IA de 30-50% via le cache KV."

## Kanban

### 🔲 À faire

#### US-012 : Validation Zod Client — 3 pts
| ID | Type | Tâche | Est. |
|----|------|-------|------|
| T-012-01 | [OPS] | Setup Zod + @hookform/resolvers dans desktop et mobile | 0.5h |
| T-012-02 | [BE] | Créer schemas Zod partagés dans @nestr/core (Event, Task, Settings) | 1.5h |
| T-012-03 | [FE-WEB] | Intégrer zodResolver dans TaskModal et SettingsPanel (desktop) | 1h |
| T-012-04 | [FE-MOB] | Intégrer zodResolver dans formulaires mobile | 1h |
| T-012-05 | [TEST] | Tests unitaires schemas Zod + tests composants validation | 1h |

#### US-009 : Cache KV IA — 5 pts
| ID | Type | Tâche | Est. |
|----|------|-------|------|
| T-009-01 | [OPS] | Créer KV namespace AI_CACHE dans Cloudflare + binding wrangler.toml | 0.5h |
| T-009-02 | [BE] | Implémenter getCachedResponse / setCachedResponse (SHA-256 hash) | 2h |
| T-009-03 | [BE] | Intégrer cache dans ai.ts (planDay, breakdown, parse) | 2h |
| T-009-04 | [TEST] | Tests unitaires cache (hit/miss/TTL/invalidation) | 1.5h |
| T-009-05 | [OPS] | Monitoring : log cache hit rate, dashboard métriques | 1h |

#### US-013 : Rituel Morning — 5 pts
| ID | Type | Tâche | Est. |
|----|------|-------|------|
| T-013-01 | [FE-WEB] | Composant MorningRitual desktop (3 questions, progression, confetti) | 3h |
| T-013-02 | [FE-MOB] | Screen MorningRitual mobile (même flow, navigation stack) | 2.5h |
| T-013-03 | [BE] | Endpoint API generateDailyPlan (prompt → plan IA) | 1.5h |
| T-013-04 | [FE-WEB][FE-MOB] | Trigger rituel (notification 8h, state "rituel du jour fait") | 1h |
| T-013-05 | [TEST] | Tests composant MorningRitual + tests API generateDailyPlan | 1.5h |

#### US-014 : Rituel Evening — 3 pts
| ID | Type | Tâche | Est. |
|----|------|-------|------|
| T-014-01 | [FE-WEB] | Composant EveningRitual desktop (rating, review tâches, suggestion IA) | 2h |
| T-014-02 | [FE-MOB] | Screen EveningRitual mobile | 1.5h |
| T-014-03 | [BE] | Endpoint API generateSuggestion (bilan → suggestion lendemain) | 1h |
| T-014-04 | [TEST] | Tests composant EveningRitual + tests API suggestion | 1h |

#### Tâches techniques transverses
| ID | Type | Tâche | Est. |
|----|------|-------|------|
| T-TECH-05 | [BE] | Fix import `zod/v4` → `zod` dans services/api/src/ai.ts | 0.25h |
| T-TECH-06 | [OPS] | Config rate limiting Cloudflare WAF (Dashboard) — débloque US-009 | 0.5h |
| T-TECH-07 | [OPS] | CI : ajouter job test-mobile quand US-011 sera implémentée | 0h (backlog) |

### 🔄 En cours

_Aucune_

### 👀 Review

_Aucune_

### ✅ Done

_Aucune_

### 🚫 Bloqué

_Aucune_

---

## Résumé

| Statut | Tâches | Heures est. |
|--------|--------|-------------|
| 🔲 À faire | 22 | ~27.25h |
| ✅ Done | 0 | 0h |
| **Total** | **22** | **~27.25h** |

## Points

| US | Points | Statut |
|----|--------|--------|
| US-012 | 3 | 🔲 À faire |
| US-009 | 5 | 🔲 À faire |
| US-013 | 5 | 🔲 À faire |
| US-014 | 3 | 🔲 À faire |
| **Total** | **16** | 0% |

## Ordre d'exécution

```
Jour 1-2 :  T-TECH-05 (fix zod) + T-TECH-06 (WAF) + US-012 (Zod validation)
Jour 2-5 :  US-009 (Cache KV) — parallélisable avec US-013
Jour 3-7 :  US-013 (Rituel morning) — dépend de US-012
Jour 7-10 : US-014 (Rituel evening) — dépend de US-013
```

## Dépendances vérifiées

| Dépendance | Statut | Action |
|------------|--------|--------|
| US-004 (Rate limiting WAF) | ❌ Non fait | → T-TECH-06 ajouté au sprint |
| US-008 (Switch Haiku) | ✅ Done | — |
| US-010 (Tests desktop) | ✅ Done | PR #19 |
| US-011 (Tests mobile) | ❌ Non fait | Soft dep — US avancent sans |
