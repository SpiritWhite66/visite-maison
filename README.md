# Visite Immo

PWA personnelle d'aide à la visite et au chiffrage de maisons (côté acheteur). Voir `SPEC.md` (fonctionnel) et `CLAUDE.md` (conventions).

```bash
npm ci --legacy-peer-deps
npm start         # serveur de dev
npm test          # tests unitaires (Vitest)
npx ng build --base-href /visite-maison/
```

Déployé sur GitHub Pages par `.github/workflows/deploy.yml` à chaque push sur `main`.
