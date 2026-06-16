# Rétrospective — Sprint 003 : Tests & Qualité V2.5

## Informations

| Attribut | Valeur |
|----------|--------|
| Date | 2026-06-16 |
| Sprint | 003 — Tests & Qualité V2.5 |
| Format | Étoile de Mer (Starfish) |
| Facilitateur | Claude (Scrum Master) |
| Participants | Solo developer |

## Directive Fondamentale

> "Peu importe ce que nous découvrons, nous comprenons et croyons sincèrement
> que chacun a fait du mieux qu'il pouvait, compte tenu de ce qu'il savait
> à ce moment-là, de ses compétences et capacités, des ressources disponibles,
> et de la situation."
> — Norman Kerth

---

## Rappel Sprint

| Métrique | Valeur |
|----------|--------|
| Sprint Goal | "Atteindre une couverture de tests ≥80% sur desktop et mobile" |
| Points planifiés | 16 (US-010: 8 + US-011: 8) |
| Points livrés | 8 (50%) |
| Tests écrits | 327 |
| Coverage atteinte | 86% lignes |
| PR | [#19](https://github.com/thibmonier/nestr/pull/19) — CI verte |

---

## Étoile de Mer ⭐

```
                 🟢 Continuer
                      │
     ⬆️ Plus de ──────┼────── 🟡 Commencer
                      │
     ⬇️ Moins de ─────┴────── 🔴 Arrêter
```

### 🟢 CONTINUER (ce qui fonctionne bien)

- **Agents parallèles pour la génération de tests** — 4 agents simultanés ont produit 327 tests en une session. Productivité massive vs séquentiel.
- **CI pipeline build-packages → tests en parallèle** — Le pattern `build-packages` artifact + 3 jobs parallèles (typecheck, test-api, test-desktop) fonctionne bien et sera réutilisable pour `test-mobile`.
- **MSW pour les mocks API** — Isolation propre des tests sans dépendance réseau, réutilisable entre hooks et composants.
- **Coverage thresholds dans vitest.config** — Automatise le gate qualité, pas besoin de vérification manuelle.
- **TDD-like workflow** — Écrire les tests, corriger les failures, itérer jusqu'à vert. Efficace pour trouver les bugs de timezone et race conditions.

### 🟡 COMMENCER (nouvelles idées à essayer)

- **Estimer US séparément** — US-010 et US-011 étaient chacune à 8 pts, mais desktop seul a pris tout le sprint. Découper en tâches plus fines dès le planning pour mieux anticiper.
- **Snapshot tests pour les composants UI stables** — CalendarPanel et DayTimeline ont beaucoup de tests de rendu qui pourraient être simplifiés par des snapshots.
- **Pre-commit hook pour les tests** — Attraper les régressions avant le push, pas seulement en CI.
- **Test coverage par module dans CI** — Afficher un breakdown (hooks vs components vs lib) dans le rapport CI pour identifier rapidement les zones faibles.

### 🔴 ARRÊTER (ce qui ne fonctionne pas)

- **Surcharger un sprint avec 2 US de même taille** — 16 pts pour un dev solo sur un sujet nouveau (setup test infra from scratch) était irréaliste. Le sprint a livré 50%.
- **Hardcoder des dates UTC dans les tests** — Source du bug timezone dans `usePlanner`. Les tests doivent construire les dates de la même façon que le code source.
- **Négliger les effets de mount dans les tests de hooks** — Le bug `useAccount` (race condition mount effect vs signIn) a coûté du temps de debug. Toujours `await waitFor()` pour laisser les effets de mount se stabiliser.

### ⬆️ PLUS DE (intensifier)

- **Plus de tests d'intégration hooks ↔ composants** — Les composants comme SettingsPanel (41 tests) sont bien couverts individuellement, mais les interactions entre hooks restent peu testées.
- **Plus de couverture sur lib/auth.ts** — Seulement 17% de coverage. Les fonctions Tauri OAuth sont difficiles à mocker mais critiques pour la sécurité.
- **Plus de documentation inline des mocks Tauri** — Le fichier `src/test/setup.ts` contient des mocks complexes qui méritent d'être mieux structurés pour réutilisation mobile.

### ⬇️ MOINS DE (réduire sans arrêter)

- **Moins de tests sur des re-exports purs** — `ai.ts`, `calendars.ts`, `sync.ts` sont des re-exports d'une ligne. 0% coverage acceptable, pas besoin de s'en préoccuper.
- **Moins de scope dans un sprint de tests initial** — Un sprint "setup infra test + première suite" puis un sprint "compléter coverage" serait plus réaliste.

---

## Analyse Root Cause : Sprint à 50%

### Problème : US-011 non démarrée

**5 Pourquoi :**

1. **Pourquoi US-011 n'a pas démarré ?** → Tout le temps a été consommé par US-010.
2. **Pourquoi US-010 a pris tout le sprint ?** → Setup infra (Vitest + RTL + MSW + mocks Tauri + CI) + 327 tests + debug failures.
3. **Pourquoi le setup a pris autant ?** → Problèmes imprévus : dual vitest instance, résolution packages workspace en CI, types jest-dom.
4. **Pourquoi ces problèmes n'étaient pas anticipés ?** → Premier setup test complet du monorepo, pas d'expérience préalable sur cette stack.
5. **Pourquoi la vélocité n'a pas été ajustée ?** → Sprint 003 est le premier sprint dédié tests, pas de données historiques pour calibrer.

**Cause racine :** Sprint de type "infrastructure" sous-estimé. Les sprints d'exploration/setup ont historiquement un overhead de 40-60% par rapport aux sprints feature.

---

## Actions Sprint 004

### Action 1 : Réduire le scope tests mobile

| Attribut | Valeur |
|----------|--------|
| Description | Reporter US-011 (tests mobile) au backlog. Sprint 004 se concentre sur UX & Cache (US-012/013/014). Les tests mobile seront un sprint dédié ultérieur. |
| Responsable | Solo developer |
| Deadline | Sprint 004 planning |
| DoD | US-011 dans le backlog avec priorité et estimation révisée |
| Priorité | Haute |

### Action 2 : Merger PR #19 et établir la baseline coverage

| Attribut | Valeur |
|----------|--------|
| Description | Merger PR #19 sur main. La coverage desktop (86%) devient le seuil de non-régression. Tout nouveau code desktop doit maintenir ≥80%. |
| Responsable | Solo developer |
| Deadline | Avant démarrage Sprint 004 |
| DoD | PR mergée, main verte, coverage gate actif |
| Priorité | Haute |

### Action 3 : Ajouter pre-commit hook tests desktop

| Attribut | Valeur |
|----------|--------|
| Description | Configurer un hook pre-push (ou pre-commit léger) qui lance les tests desktop pour attraper les régressions avant CI. |
| Responsable | Solo developer |
| Deadline | Sprint 004 — Semaine 1 |
| DoD | `git push` échoue si tests desktop cassés |
| Priorité | Moyenne |

---

## Suivi Actions Précédentes

| Sprint | Action | Status |
|--------|--------|--------|
| S-001 | Setup CI GitHub Actions | ✅ Fait (amélioré en S-003) |
| S-002 | Tests API (ai.test.ts, db.test.ts) | ✅ Fait |
| _Premier sprint avec rétro formelle_ | — | — |

---

## Métriques de Vélocité

| Sprint | Planifié | Livré | Vélocité | Tendance |
|--------|----------|-------|----------|----------|
| 001 | — | — | — | — |
| 002 | — | — | — | — |
| 003 | 16 | 8 | 8 | Première mesure |

> Note : Sprints 001-002 n'avaient pas de tracking formel en story points. Sprint 003 établit la première baseline de vélocité à **8 pts/sprint** pour un dev solo.

---

## Check-out

**Ce que j'emporte de ce sprint :**

1. **L'infra test est en place** — 327 tests, CI verte, coverage gates. Investissement lourd mais payant pour tous les sprints futurs.
2. **Vélocité calibrée** — 8 pts/sprint est la baseline réaliste pour un dev solo. Les prochains sprints seront mieux dimensionnés.
3. **Les sprints d'infra doivent être estimés à ×1.5** — Prévoir 50% de buffer pour les problèmes imprévus de configuration.

---

## Prochaines Étapes

1. Merger PR #19 sur main
2. `/workflow:start 004` — Démarrer Sprint 004 : UX & Cache
3. Planifier US-011 (tests mobile) dans un sprint dédié futur
