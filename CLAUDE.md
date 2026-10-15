# CLAUDE.md — Visite Immo

## Contexte
PWA personnelle d'aide à la visite et au chiffrage de maisons (ville et rural), côté acheteur.
**La spec fonctionnelle est dans `SPEC.md` : c'est la source de vérité.** La relire avant chaque lot ; ne pas inventer de fonctionnalités absentes de la spec.

## Contexte de travail
- Le développeur pilote Claude Code **depuis une tablette** : il ne voit ni le serveur de dev ni les DevTools.
- Il teste **uniquement via le déploiement GitHub Pages** sur un téléphone Android. Chaque lot doit donc se terminer par un build vert et un déploiement fonctionnel.
- Prévoir un petit écran « Diagnostic » dans Paramètres (version, état du service worker, stockage persistant, taille IndexedDB, dernières erreurs capturées) pour compenser l'absence de DevTools.

## Stack
- Angular récent : composants standalone, signals, nouveau control flow (`@if`, `@for`), routing lazy par feature.
- PWA : `@angular/pwa` (service worker + manifest), stratégie de cache permettant un fonctionnement 100 % hors ligne.
- Persistance : IndexedDB via **Dexie.js**.
- Styles : SCSS, mobile-first, pas de framework UI lourd sauf justification.
- PDF : feuille de style `@media print` + `window.print()`, aucune librairie PDF.
- Tests : tests unitaires obligatoires sur le domaine (calculs de budget, barème, coefficients).

## Architecture (hexagonale légère)
```
src/app/
  domain/        # modèles + règles de calcul en TypeScript pur, sans Angular ni Dexie
  application/   # services / cas d'usage, dépendent des ports
  ports/         # interfaces des repositories
  adapters/      # implémentations Dexie, export/import JSON, compression photo
  features/      # écrans : biens, fiche-bien, visite, parametres
  shared/        # composants UI réutilisables
```
- `domain/` n'importe rien d'Angular ni de Dexie.
- Les composants passent par `application/`, jamais directement par Dexie.
- Catalogue de checklist et barème par défaut : fichiers TypeScript statiques dans `domain/`.

## Conventions
- Code et identifiants en français cohérents avec `SPEC.md` (`Bien`, `PosteTravaux`, `prixNegocie`…). Interface en français.
- Montants : `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`, pas d'arrondi intermédiaire.
- Sauvegarde automatique à chaque modification en mode visite (pas de bouton « Enregistrer »).
- Cibles tactiles ≥ 44 px, utilisable à une main.
- Pas de nouvelle dépendance sans expliquer pourquoi dans le message de commit.

## Déploiement
- Workflow GitHub Actions : install → tests → build (`--base-href` adapté au nom du dépôt) → déploiement GitHub Pages sur push `main`.
- Copier `index.html` en `404.html` pour le routing côté client.
- Incrémenter la version affichée dans l'écran Diagnostic à chaque déploiement.

## Façon de travailler
- Avancer **lot par lot** selon le §11 de `SPEC.md`, un lot = une branche + PR (ou commits clairs sur `main` si demandé).
- En début de lot : résumer le plan en quelques lignes et attendre validation si un choix structurant est à faire.
- En fin de lot : tests verts, build vert, déploiement OK, et une courte liste « à tester sur le téléphone ».
- En cas d'ambiguïté dans la spec : poser la question plutôt que deviner.
