# Configuration WAF Rate Limiting — Cloudflare

## Règles à configurer dans Cloudflare Dashboard

> Dashboard → Security → WAF → Rate limiting rules

### Règle 1 : Limite générale API

- **Nom** : `nestr-api-general`
- **Expression** : `http.request.uri.path matches "^/"`
- **Seuil** : 100 requêtes par minute par IP
- **Action** : Block (429)
- **Durée du block** : 60 secondes

### Règle 2 : Limite endpoints IA

- **Nom** : `nestr-api-ai`
- **Expression** : `http.request.uri.path matches "^/ai/"`
- **Seuil** : 10 requêtes par minute par IP
- **Action** : Block (429)
- **Durée du block** : 60 secondes

### Règle 3 : Limite endpoints auth

- **Nom** : `nestr-api-auth`
- **Expression** : `http.request.uri.path matches "^/auth/"`
- **Seuil** : 5 requêtes par minute par IP
- **Action** : Block (429)
- **Durée du block** : 120 secondes

## Vérification

```bash
# Test rate limit général (> 100 req/min devrait retourner 429)
for i in $(seq 1 110); do curl -s -o /dev/null -w "%{http_code}" https://api.nestr.app/; done

# Test rate limit IA (> 10 req/min)
for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code}" -X POST https://api.nestr.app/ai/estimate; done
```

## Header de réponse attendu sur 429

```
Retry-After: 60
```
