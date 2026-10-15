# SPEC — PWA « Visite Immo » (côté acheteur)

> Source de vérité fonctionnelle du projet. Toute évolution du besoin se fait ici d'abord.

## 1. Objectif

Application personnelle, utilisée par **un seul utilisateur sur un seul appareil Android**, pour :

1. **Estimer le budget réel** d'un bien : prix négocié + frais de notaire + travaux (fourchette basse/haute). → **Priorité 1**
2. **Saisir une visite** sur place (checklist par thème, pièces et mesures, photos) et produire un **compte rendu PDF** (synthèse brute, usage personnel). → **Priorité 2**
3. **Suivre les étapes** de chaque bien (visite, contre-visite, offre…). → **Priorité 3**
4. **Comparer les biens** avec une note pondérée. → **Priorité 4 (v2, hors MVP)**

Types de biens couverts : **maison en ville / lotissement** et **maison rurale avec terrain**.

## 2. Hors périmètre (MVP)

- Pas de backend, pas de compte utilisateur, pas de synchronisation multi-appareils.
- Pas de dictée vocale.
- Pas d'import automatique d'annonces (saisie manuelle + URL de l'annonce).
- Pas d'appartement ni de terrain nu.
- Pas de simulation de prêt ni d'aides à la rénovation.

## 3. Contraintes non fonctionnelles

- **PWA installable** sur Android (Chrome), **100 % fonctionnelle hors ligne** (visites en zone rurale sans réseau).
- **Mobile-first**, utilisable à une main, gros boutons, saisie rapide debout pendant une visite.
- Interface **en français**, montants en euros, nombres au format français.
- **Données 100 % locales** (IndexedDB). Demander `navigator.storage.persist()` au premier lancement pour éviter l'éviction par le navigateur.
- **Sauvegarde** : export/import d'un fichier JSON complet (photos incluses en base64), car les données n'existent nulle part ailleurs.
- Photos **compressées côté client** (bord long max ~1600 px, JPEG qualité ~0.75).

## 4. Modèle de données

### Bien
| Champ | Type | Notes |
|---|---|---|
| id | string (uuid) | |
| titre | string | ex. « Longère Lombez 4 ch. » |
| typeBien | `VILLE` \| `RURAL` | détermine les thèmes de checklist |
| urlAnnonce | string? | |
| adresse, commune | string | |
| contact | { nom, agence?, telephone?, email? } | |
| prixAffiche | number | € |
| margeNegociationPct | number | % visé, défaut paramétrable |
| surfaceHabitable | number? | m² |
| surfaceTerrain | number? | m² |
| anneeConstruction | number? | |
| dpe, ges | `A`…`G` \| null | |
| etape | Etape (cf. §7) | |
| historiqueEtapes | { etape, date, commentaire? }[] | horodaté automatiquement |
| impressionGlobale | 1–5 \| null | |
| notes | string | |
| creeLe, modifieLe | ISO date | |

### Visite
| Champ | Type | Notes |
|---|---|---|
| id, bienId | string | |
| date | ISO date | |
| typeVisite | `PREMIERE` \| `CONTRE_VISITE` | |
| reponses | ReponseChecklist[] | |
| notes | string | |

### ReponseChecklist
| Champ | Type | Notes |
|---|---|---|
| pointId | string | référence vers le catalogue de checklist |
| etat | `OK` \| `A_SURVEILLER` \| `TRAVAUX` \| `NA` \| `NON_VERIFIE` | défaut `NON_VERIFIE` |
| commentaire | string? | |
| photoIds | string[] | |
| posteTravauxId | string? | lien vers le poste créé depuis ce point |

### Piece
| Champ | Type | Notes |
|---|---|---|
| id, bienId | string | |
| nom | string | ex. « Séjour », « Grange » |
| longueur, largeur | number? | m |
| surface | number? | m², calculée si L×l renseignés, sinon saisie libre |
| hauteurSousPlafond | number? | m |
| photoIds | string[] | |
| notes | string | |

### Photo
`{ id, bienId, blob (JPEG compressé), legende?, prisLe }` — stockée dans une table dédiée, rattachée à une pièce ou à un point de checklist.

### PosteTravaux
| Champ | Type | Notes |
|---|---|---|
| id, bienId | string | |
| categorie | Categorie | cf. barème |
| libelle | string | |
| modeChiffrage | `MANUEL` \| `BAREME` | |
| baremeId | string? | si `BAREME` |
| quantite | number? | si `BAREME` |
| realisation | `ARTISAN` \| `DIY` | |
| montantBas, montantHaut | number | € — calculés si `BAREME`, saisis si `MANUEL` |
| priorite | `URGENT` \| `COURT_TERME` \| `CONFORT` | |
| notes | string? | |

### LigneBareme
`{ id, categorie, libelle, unite: 'M2' | 'ML' | 'UNITE' | 'FORFAIT', prixBas, prixHaut, coefDiy? }`
Prix = **prix artisan TTC fourni-posé**. Pour un poste `DIY`, montant = prix × `coefDiy` (ou coefficient global si absent).

### Parametres
`{ tauxNotairePct (défaut 8), margeNegociationDefautPct (défaut 5), coefDiyDefaut (défaut 0.4) }`

### Etage (plan)
`{ id, bienId, nom, ordre, elements: ElementPlan[] }` — un niveau du bien (rez-de-chaussée, étage, combles, sous-sol, dépendance…). Coordonnées en mètres.
- `Mur` : `{ x1, y1, x2, y2, epaisseur }` (cloison 10 cm, mur 20 cm, mur épais 40 cm).
- `Ouverture` (`PORTE` | `FENETRE`) : accrochée à un mur (`murId`, position `t` de 0 à 1, `largeur`, sens d'ouverture et charnière pour une porte) ; elle suit le mur et disparaît avec lui.
- `EtiquettePlan` : nom de pièce (`texte`, `pieceId?` pour afficher la surface d'une pièce relevée).
- `EquipementPlan` : `ECS` (chauffe-eau), `TABLEAU_ELECTRIQUE`, `CHAUFFAGE`, `COMPTEUR_EAU`.

### FichierPlan
`{ id, bienId, etageId, nom, typeMime, blob, ajouteLe }` — plan importé (photo réduite à 2400 px, ou fichier tel quel, PDF compris).

## 5. Règles de calcul (domaine pur, testé unitairement)

- `prixNegocie = prixAffiche × (1 − margeNegociationPct / 100)`
- `fraisNotaire = prixNegocie × tauxNotairePct / 100` (approximation « ancien », paramétrable)
- Poste au barème : `montant{Bas,Haut} = quantite × prix{Bas,Haut} × (realisation === 'DIY' ? coefDiy : 1)`
- `travaux{Bas,Haut} = Σ postes`
- `budgetTotal{Bas,Haut} = prixNegocie + fraisNotaire + travaux{Bas,Haut}`
- Afficher aussi : sous-totaux par catégorie, par priorité, et la part DIY vs artisan.
- Arrondis : à l'euro pour l'affichage, aucun arrondi intermédiaire dans les calculs.

## 6. Barème pré-rempli (valeurs indicatives, éditables)

Ordres de grandeur France, artisan TTC fourni-posé. **À vérifier et ajuster** : ils servent de point de départ, pas de devis.

| Catégorie | Libellé | Unité | Bas | Haut |
|---|---|---|---|---|
| Toiture | Réfection complète couverture tuiles | m² | 120 | 250 |
| Toiture | Révision / remplacement tuiles ponctuel | forfait | 500 | 2 500 |
| Toiture | Traitement charpente | m² | 20 | 40 |
| Isolation | Combles perdus (soufflage) | m² | 25 | 50 |
| Isolation | Murs par l'intérieur | m² | 50 | 100 |
| Isolation | Murs par l'extérieur (ITE) | m² | 120 | 200 |
| Menuiseries | Fenêtre double vitrage | unité | 600 | 1 200 |
| Menuiseries | Porte d'entrée | unité | 1 500 | 4 000 |
| Électricité | Rénovation complète | m² | 80 | 140 |
| Électricité | Mise en sécurité tableau | forfait | 1 000 | 2 500 |
| Plomberie | Salle de bain complète | forfait | 6 000 | 15 000 |
| Plomberie | Remplacement chauffe-eau | forfait | 800 | 2 500 |
| Cuisine | Cuisine équipée posée | forfait | 4 000 | 15 000 |
| Chauffage | Poêle à bois posé avec conduit | forfait | 3 000 | 7 000 |
| Chauffage | Pompe à chaleur air/eau | forfait | 10 000 | 18 000 |
| Ventilation | VMC simple flux | forfait | 800 | 2 000 |
| Sols | Carrelage posé | m² | 50 | 100 |
| Sols | Parquet posé | m² | 40 | 90 |
| Finitions | Peinture murs et plafonds | m² | 25 | 45 |
| Humidité | Traitement remontées capillaires | ml | 100 | 250 |
| Assainissement | Installation ANC (filtre / micro-station) | forfait | 7 000 | 15 000 |
| Assainissement | Raccordement tout-à-l'égout | forfait | 3 000 | 10 000 |
| Eau | Forage | forfait | 5 000 | 15 000 |
| Eau | Récupérateur eau de pluie enterré | forfait | 2 000 | 6 000 |
| Extérieur | Clôture grillage rigide | ml | 40 | 90 |
| Extérieur | Portail | unité | 1 500 | 5 000 |
| Gros œuvre | Reprise de fissures / maçonnerie | forfait | 1 000 | 10 000 |
| Gros œuvre | Démolition et évacuation | forfait | 1 000 | 5 000 |

Coefficient DIY par défaut : **0.4** (≈ coût matériaux seul).

## 7. Suivi des étapes

Étapes : `REPERE` → `VISITE_PLANIFIEE` → `VISITE` → `CONTRE_VISITE` → `OFFRE_FAITE` → `OFFRE_ACCEPTEE` → `COMPROMIS`, plus les étapes terminales `OFFRE_REFUSEE` et `ABANDONNE`.

- Changement d'étape libre (pas de workflow bloquant), chaque changement ajouté à `historiqueEtapes` avec date et commentaire optionnel.
- Pour `OFFRE_FAITE` : champ montant de l'offre.
- Liste des biens filtrable par étape ; les biens terminés sont masqués par défaut.

## 8. Catalogue de checklist

Catalogue **statique versionné dans le code** (`checklist-catalogue.ts`), chaque point ayant : `id`, `theme`, `libelle`, `aide?` (quoi regarder), `typesBien` (`VILLE`, `RURAL` ou les deux), `categorieTravaux?` (pour pré-remplir un poste).

### Thèmes communs (ville + rural)
- **Structure et extérieur** : fissures façade, état enduit, gouttières et descentes, fondations visibles, mitoyenneté.
- **Toiture et charpente** : état des tuiles vu du sol, faîtage, combles (traces d'eau, insectes, isolation présente), âge de la couverture.
- **Humidité** : traces au bas des murs, salpêtre, odeur de moisi, ventilation, cave / vide sanitaire.
- **Menuiseries** : simple / double vitrage, état des bois, volets.
- **Électricité** : âge du tableau, disjoncteur différentiel 30 mA, prises avec terre, diagnostic électrique.
- **Plomberie et eau chaude** : pression, type et âge du chauffe-eau, canalisations visibles.
- **Pièces de vie** : luminosité, orientation, hauteur sous plafond, agencement.
- **Cuisine et salle de bain** : état, réutilisable ou à refaire.
- **Environnement** : bruit, voisinage, réseau mobile, commerces, trajet.
- **Risques et administratif** : diagnostics fournis, retrait-gonflement des argiles et inondation (Géorisques), PLU, servitudes, taxe foncière.

### Thèmes détaillés « rural »
- **Assainissement** : raccordé au tout-à-l'égout ou ANC ; si ANC : type (fosse septique, toutes eaux, filtre, micro-station), date du dernier contrôle SPANC, conformité, emplacement de l'épandage, odeurs.
- **Terrain, clôtures, dépendances** : bornage, accès et chemin (privé / servitude), clôtures existantes, état des granges et dépendances (toiture, structure), arbres proches de la maison, pente et écoulement des eaux.
- **Eau** : raccordement au réseau, puits ou forage (déclaré ? analyse d'eau ?), récupération d'eau de pluie, compteur.
- **Chauffage bois, isolation, DPE** : mode de chauffage, poêle ou insert (âge, conduit, certificat de ramonage), isolation des combles et murs, classe DPE et date du diagnostic, consommation annoncée.

### Interaction
- Un point marqué `TRAVAUX` propose **« Créer un poste de travaux »**, pré-rempli avec la catégorie du point (et une ligne de barème suggérée).
- Indicateur de progression par thème (points vérifiés / total).

## 9. Écrans

1. **Liste des biens** : carte par bien (titre, commune, étape, budget total bas–haut, photo de couverture), filtre par étape, bouton « + Bien ».
2. **Fiche bien** (onglets) :
   - **Synthèse** : infos clés, étape, budget total avec décomposition (prix négocié, notaire, travaux bas/haut).
   - **Travaux** : liste des postes groupés par catégorie, ajout manuel ou depuis barème, bascule artisan/DIY, totaux.
   - **Visites** : liste des visites, bouton « Démarrer une visite ».
   - **Pièces** : pièces avec mesures et photos, surface totale calculée.
   - **Suivi** : étape courante et historique.
   - **Plan** : un bloc par niveau, avec l'aperçu du dessin et les plans importés (photo ou fichier). Éditeur plein écran : outils mur, pièce rectangulaire, porte, fenêtre, nom de pièce, équipement ; sélection pour déplacer, étirer, modifier la longueur ou supprimer ; aimant désactivable (grille de 10 cm, extrémités des murs, angles à 0/45/90°) ; cotes affichables ; annuler / rétablir ; pincer pour zoomer ; sauvegarde automatique. Stylet : mode activé automatiquement (le stylet dessine, les doigts déplacent et zooment, la paume est ignorée), réticule aimanté au survol, gomme du stylet, bouton latéral pour sélectionner.
3. **Mode visite** : thèmes en accordéon, pour chaque point des boutons d'état en un tap (OK / À surveiller / Travaux / N/A), commentaire et photo accessibles en un tap, sauvegarde automatique à chaque modification.
4. **Paramètres** : taux notaire, marge par défaut, coefficient DIY, édition du barème, export/import JSON, état du stockage persistant.

## 10. Compte rendu PDF

- Généré via une **feuille de style d'impression** et `window.print()` (Chrome Android → « Enregistrer au format PDF »). Pas de librairie PDF.
- Contenu (synthèse brute) : en-tête du bien, budget total décomposé, tableau des postes de travaux, points `TRAVAUX` et `A_SURVEILLER` avec commentaires, pièces et surfaces, vignettes photo des points signalés, notes libres.
- Les points `OK` sont résumés par un compteur par thème, pas listés.

## 11. Lotissement

| Lot | Contenu | Critère de fin |
|---|---|---|
| 0 | Socle : projet Angular, PWA (service worker, manifest), Dexie, déploiement GitHub Pages via GitHub Actions | L'appli vide s'installe sur Android et s'ouvre hors ligne |
| 1 | Biens (CRUD), paramètres, barème pré-rempli, postes de travaux, calcul du budget | Budget total correct sur un bien saisi, tests du domaine verts |
| 2 | Mode visite : catalogue de checklist, réponses, pièces et mesures, photos compressées, création de poste depuis un point | Une visite complète se fait hors ligne |
| 3 | Export/import JSON, `storage.persist()` | Export → réinstallation → import restaure tout, photos comprises |
| 4 | Compte rendu PDF | PDF lisible généré depuis Chrome Android |
| 5 | Suivi des étapes et filtres | Historique horodaté visible |
| v2 | Comparatif noté pondéré entre biens | — |
