# SPEC — PWA « Visite Immo » (côté acheteur)

> Source de vérité fonctionnelle du projet. Toute évolution du besoin se fait ici d'abord.

## 1. Objectif

Application personnelle, utilisée par **un seul utilisateur sur un seul appareil Android**, pour :

1. **Estimer le budget réel** d'un bien : prix négocié + frais de notaire + travaux (fourchette basse/haute). → **Priorité 1**
2. **Saisir une visite** sur place (checklist par thème, pièces et mesures, photos) et produire un **compte rendu PDF** (synthèse brute, usage personnel). → **Priorité 2**
3. **Suivre les étapes** de chaque bien (visite, contre-visite, offre…). → **Priorité 3**
4. **Comparer les biens** avec une note pondérée. → **Priorité 4 (v2, hors MVP)**
5. **Monter le plan de financement** d'un bien : aides éligibles, prêts, tableau d'amortissement (§12).

Types de biens couverts : **maison en ville / lotissement** et **maison rurale avec terrain**.

## 2. Hors périmètre (MVP)

- Pas de backend, pas de compte utilisateur, pas de synchronisation multi-appareils.
- Pas de dictée vocale.
- Pas d'import automatique d'annonces (saisie manuelle + URL de l'annonce).
- Pas d'appartement ni de terrain nu.
- Pas de simulation de prêt ni d'aides à la rénovation dans le MVP : ajoutées ensuite (§12), à titre d'estimation, sans dépôt de dossier.

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
| historiqueEtapes | { etape, date, commentaire?, montant? }[] | horodaté automatiquement ; `montant` = montant de l'offre (étape `OFFRE_FAITE`) |
| impressionGlobale | 1–5 \| null | |
| photoCouvertureId | string? | photo de couverture, affichée dans la liste des biens |
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
| devisRetenu | { devisId, montant }? | copie du devis accepté (§13) : son montant remplace l'estimation (bas = haut) |

### LigneBareme
`{ id, categorie, libelle, unite: 'M2' | 'ML' | 'UNITE' | 'FORFAIT', prixBas, prixHaut, coefDiy? }`
Prix = **prix artisan TTC fourni-posé**. Pour un poste `DIY`, montant = prix × `coefDiy` (ou coefficient global si absent).

### Parametres
`{ tauxNotairePct (défaut 8), margeNegociationDefautPct (défaut 5), coefDiyDefaut (défaut 0.4), foyer? }` — `foyer` : foyer emprunteur du financement (§12), commun à tous les biens.

### Personne et Avis
- `Personne` : `{ id, prenom }`, déclarée dans Paramètres (prénoms uniques, casse ignorée). Supprimer une personne supprime ses avis.
- `Avis` : `{ id (bienId:personneId), bienId, personneId, absente, etoiles (1–5 ou null), commentaire, modifieLe }`. Un avis par personne et par bien ; pas d'avis enregistré = « à donner ». `absente: true` est le **N/A** (la personne n'était pas là) : il efface les étoiles et n'entre pas dans la moyenne.
- Moyenne = moyenne des étoiles données (N/A et avis sans étoiles exclus). Elle s'affiche sur la carte du bien, dans la synthèse et dans le compte rendu.

### Etage (plan)
`{ id, bienId, nom, ordre, elements: ElementPlan[] }` — un niveau du bien (rez-de-chaussée, étage, combles, sous-sol, dépendance…). Coordonnées en mètres.
- `Mur` : `{ x1, y1, x2, y2, epaisseur }` (cloison 10 cm, mur 20 cm, mur épais 40 cm).
- `Ouverture` (`PORTE` | `FENETRE`) : accrochée à un mur (`murId`, position `t` de 0 à 1, `largeur`, sens d'ouverture et charnière pour une porte) ; elle suit le mur et disparaît avec lui.
- `EtiquettePlan` : nom de pièce (`texte`, `pieceId?` pour afficher la surface d'une pièce relevée).
- `EquipementPlan` : `ECS` (chauffe-eau), `TABLEAU_ELECTRIQUE`, `CHAUFFAGE`, `COMPTEUR_EAU`.

### FichierPlan
`{ id, bienId, etageId, nom, typeMime, blob, ajouteLe }` — plan importé (photo réduite à 2400 px, ou fichier tel quel, PDF compris).

### Devis et FichierDevis
- `Devis` : `{ id, bienId, posteId (null = pas encore rattaché), entreprise, objet, montantTtc, date, valableJusquau?, statut: EN_ATTENTE | ACCEPTE | REFUSE, notes, ajouteLe, modifieLe }` (§13).
- `FichierDevis` : `{ id, bienId, devisId, nom, typeMime, blob, ajouteLe }` — photo d'une page (réduite à 2400 px) ou fichier tel quel (PDF).

### Sauvegarde (export / import JSON)
Un seul fichier `visite-immo-AAAA-MM-JJ.json` contenant toutes les tables (biens, postes, visites, pièces, étages, barème, réglages, personnes, avis, plans de financement, devis) et les images et fichiers en base 64 (`photos`, `fichiersPlan`, `fichiersDevis`, avec leur type MIME). Champs d'en-tête : `format` (« visite-immo »), `version` (du format, 1), `exporteLe`, `versionApp`.
- **Importer** : le fichier est lu et contrôlé avant toute écriture (format, version, identifiants, fichiers non tronqués) ; un résumé est affiché. Deux modes : *Remplacer* (la base devient identique à la sauvegarde, en une seule transaction : tout ou rien) ou *Fusionner* (ajout ou mise à jour des biens et de ce qui s'y rattache par identifiant ; réglages et barème locaux conservés).
- Une sauvegarde d'une version plus récente du format est refusée avec un message ; les tables absentes d'une ancienne version sont lues comme vides.
- Les réglages portent `derniereSauvegarde`. Rappel (bandeau dans la liste des biens, bloc dans Paramètres) s'il y a des biens et qu'aucune sauvegarde n'a été faite depuis 14 jours.

## 5. Règles de calcul (domaine pur, testé unitairement)

- `prixNegocie = prixAffiche × (1 − margeNegociationPct / 100)`
- `fraisNotaire = prixNegocie × tauxNotairePct / 100` (approximation « ancien », paramétrable)
- Poste au barème : `montant{Bas,Haut} = quantite × prix{Bas,Haut} × (realisation === 'DIY' ? coefDiy : 1)`
- Poste avec un devis accepté : `montantBas = montantHaut = montant TTC du devis`, quel que soit le mode de chiffrage (§13).
- `travaux{Bas,Haut} = Σ postes`
- `budgetTotal{Bas,Haut} = prixNegocie + fraisNotaire + travaux{Bas,Haut}`
- Afficher aussi : sous-totaux par catégorie, par priorité, et la part DIY vs artisan.
- Arrondis : à l'euro pour l'affichage, aucun arrondi intermédiaire dans les calculs.

## 6. Barème pré-rempli (valeurs indicatives, éditables)

Ordres de grandeur France, artisan TTC fourni-posé. **À vérifier et ajuster** : ils servent de point de départ, pas de devis.

**Gammes** : chaque ligne a un prix de *moyen de gamme* (la gamme par défaut). Quand le niveau de finition change vraiment le prix (parquet, cuisine, fenêtres…), la ligne a aussi des prix *bas de gamme* et *haut de gamme* ; un poste au barème choisit sa gamme (moyen de gamme par défaut, y compris pour les postes créés avant l'arrivée des gammes). Une ligne sans prix pour une gamme n'est proposée qu'en moyen de gamme. Les prix de chaque gamme s'éditent dans Paramètres.

À la mise à jour d'une base existante (IndexedDB v4) : les postes au barème passent en moyen de gamme ; les lignes d'origine reçoivent les prix bas et haut de gamme sans que leur prix (éventuellement modifié) change ; les nouvelles lignes sont ajoutées ; une ligne d'origine supprimée ne revient pas.

| Catégorie | Libellé | Unité | Bas de gamme | Moyen de gamme (défaut) | Haut de gamme |
|---|---|---|---|---|---|
| Toiture | Réfection complète couverture tuiles | m² | 90 – 150 | 120 – 250 | 200 – 350 |
| Toiture | Révision / remplacement tuiles ponctuel | forfait | — | 500 – 2 500 | — |
| Toiture | Traitement charpente | m² | — | 20 – 40 | — |
| Toiture | Démoussage et hydrofuge de toiture | m² | — | 15 – 35 | — |
| Toiture | Gouttières et descentes | ml | 25 – 45 | 40 – 90 | 80 – 150 |
| Toiture | Fenêtre de toit (type Velux) | unité | 600 – 1 100 | 900 – 2 000 | 1 800 – 3 500 |
| Isolation | Combles perdus (soufflage) | m² | — | 25 – 50 | — |
| Isolation | Murs par l'intérieur | m² | 40 – 70 | 50 – 100 | 80 – 130 |
| Isolation | Murs par l'extérieur (ITE) | m² | 100 – 150 | 120 – 200 | 180 – 260 |
| Isolation | Rampants / sous toiture | m² | 40 – 70 | 50 – 110 | 90 – 150 |
| Isolation | Plancher bas (sous-sol, vide sanitaire) | m² | — | 30 – 70 | — |
| Menuiseries | Fenêtre double vitrage | unité | 400 – 700 | 600 – 1 200 | 1 100 – 2 000 |
| Menuiseries | Porte d'entrée | unité | 900 – 1 600 | 1 500 – 4 000 | 3 500 – 7 000 |
| Menuiseries | Porte-fenêtre / baie vitrée | unité | 900 – 1 700 | 1 500 – 3 500 | 3 000 – 7 000 |
| Menuiseries | Volet roulant | unité | 300 – 550 | 450 – 1 100 | 900 – 1 800 |
| Menuiseries | Porte intérieure | unité | 180 – 350 | 300 – 700 | 600 – 1 300 |
| Menuiseries | Porte de garage | unité | 800 – 1 500 | 1 200 – 3 500 | 3 000 – 6 000 |
| Électricité | Rénovation complète | m² | — | 80 – 140 | — |
| Électricité | Mise en sécurité tableau | forfait | — | 1 000 – 2 500 | — |
| Électricité | Ajout prise ou point lumineux | unité | — | 80 – 200 | — |
| Plomberie | Salle de bain complète | forfait | 4 000 – 8 000 | 6 000 – 15 000 | 12 000 – 25 000 |
| Plomberie | Remplacement chauffe-eau | forfait | — | 800 – 2 500 | — |
| Plomberie | Chauffe-eau thermodynamique | forfait | — | 2 500 – 4 500 | — |
| Plomberie | Douche à l'italienne | forfait | 2 000 – 4 000 | 3 000 – 7 000 | 6 000 – 12 000 |
| Plomberie | Remplacement WC | unité | 250 – 500 | 400 – 1 000 | 900 – 2 000 |
| Plomberie | Réfection réseau d'eau (cuivre / PER) | forfait | — | 2 000 – 6 000 | — |
| Cuisine | Cuisine équipée posée | forfait | 2 500 – 6 000 | 4 000 – 15 000 | 12 000 – 30 000 |
| Cuisine | Rafraîchissement (façades, plan de travail) | forfait | 800 – 2 000 | 1 500 – 5 000 | 4 000 – 9 000 |
| Chauffage | Poêle à bois posé avec conduit | forfait | 2 000 – 4 000 | 3 000 – 7 000 | 6 000 – 12 000 |
| Chauffage | Pompe à chaleur air/eau | forfait | 8 000 – 12 000 | 10 000 – 18 000 | 15 000 – 22 000 |
| Chauffage | Chaudière gaz à condensation | forfait | 3 000 – 5 000 | 4 000 – 8 000 | 7 000 – 11 000 |
| Chauffage | Radiateur électrique performant | unité | 200 – 450 | 400 – 1 100 | 900 – 1 800 |
| Chauffage | Tubage de conduit de cheminée | forfait | — | 1 200 – 2 500 | — |
| Ventilation | VMC simple flux | forfait | — | 800 – 2 000 | — |
| Ventilation | VMC double flux | forfait | — | 4 000 – 8 000 | — |
| Sols | Carrelage posé | m² | 35 – 60 | 50 – 100 | 90 – 180 |
| Sols | Parquet posé | m² | 30 – 50 | 40 – 90 | 80 – 160 |
| Sols | Sol stratifié posé | m² | 18 – 30 | 25 – 55 | 45 – 75 |
| Sols | Sol vinyle / PVC posé | m² | 18 – 32 | 25 – 60 | 50 – 90 |
| Sols | Ragréage | m² | — | 15 – 30 | — |
| Finitions | Peinture murs et plafonds | m² | 18 – 30 | 25 – 45 | 40 – 70 |
| Finitions | Cloison en plaques de plâtre | m² | — | 40 – 80 | — |
| Finitions | Faux plafond | m² | — | 40 – 80 | — |
| Humidité | Traitement remontées capillaires | ml | — | 100 – 250 | — |
| Humidité | Drainage périphérique | ml | — | 80 – 200 | — |
| Assainissement | Installation ANC (filtre / micro-station) | forfait | — | 7 000 – 15 000 | — |
| Assainissement | Raccordement tout-à-l'égout | forfait | — | 3 000 – 10 000 | — |
| Assainissement | Vidange de fosse | forfait | — | 200 – 450 | — |
| Eau | Forage | forfait | — | 5 000 – 15 000 | — |
| Eau | Récupérateur eau de pluie enterré | forfait | — | 2 000 – 6 000 | — |
| Eau | Analyse d'eau (puits, forage) | forfait | — | 100 – 300 | — |
| Eau | Adoucisseur d'eau | forfait | — | 1 000 – 2 500 | — |
| Extérieur | Clôture grillage rigide | ml | 25 – 45 | 40 – 90 | 80 – 150 |
| Extérieur | Portail | unité | 800 – 1 800 | 1 500 – 5 000 | 4 000 – 9 000 |
| Extérieur | Ravalement de façade | m² | 30 – 50 | 40 – 100 | 80 – 150 |
| Extérieur | Terrasse bois | m² | 70 – 120 | 100 – 220 | 180 – 320 |
| Extérieur | Terrasse carrelée ou béton | m² | 50 – 100 | 80 – 180 | 150 – 280 |
| Extérieur | Abattage d'arbre | unité | — | 400 – 1 500 | — |
| Extérieur | Allée ou cour gravillonnée | m² | — | 20 – 50 | — |
| Gros œuvre | Reprise de fissures / maçonnerie | forfait | — | 1 000 – 10 000 | — |
| Gros œuvre | Démolition et évacuation | forfait | — | 1 000 – 5 000 | — |
| Gros œuvre | Ouverture dans un mur porteur | forfait | — | 3 000 – 8 000 | — |
| Gros œuvre | Dalle béton | m² | — | 60 – 120 | — |
| Autre | Désamiantage | forfait | — | 2 000 – 8 000 | — |
| Autre | Traitement anti-termites | forfait | — | 1 500 – 3 500 | — |

## 7. Suivi des étapes

Étapes : `REPERE` → `VISITE_PLANIFIEE` → `VISITE` → `CONTRE_VISITE` → `OFFRE_FAITE` → `OFFRE_ACCEPTEE` → `COMPROMIS`, plus les étapes terminales `OFFRE_REFUSEE` et `ABANDONNE`.

- Changement d'étape libre (pas de workflow bloquant), chaque changement ajouté à `historiqueEtapes` avec date et commentaire optionnel.
- Pour `OFFRE_FAITE` : champ montant de l'offre (pré-rempli avec le prix négocié ou la dernière offre) ; il peut y avoir plusieurs offres, la dernière est affichée.
- Le dernier changement peut être annulé (l'étape initiale reste toujours).
- Liste des biens filtrable par étape (puces avec compteurs : En cours, une puce par étape présente, Terminés, Tous) ; les biens terminés sont masqués par défaut (filtre « En cours »). Le filtre est conservé quand on ouvre un bien puis qu'on revient à la liste.

## 8. Catalogue de checklist

Catalogue **statique versionné dans le code** (`checklist-catalogue.ts`), chaque point ayant : `id`, `theme`, `libelle`, `aide?` (quoi regarder), `typesBien` (`VILLE`, `RURAL` ou les deux), `categorieTravaux?` (pour pré-remplir un poste).

### Thèmes communs (ville + rural)
- **Structure et extérieur** : fissures façade, état enduit, gouttières et descentes, fondations visibles, mitoyenneté.
- **Jardin et extérieur** (l'extérieur est un critère majeur pour nous) : surface et forme du jardin, exposition et ensoleillement, vis-à-vis et intimité, terrasse, nature du sol, arbres / haies / plantations, place pour un potager, point d'eau extérieur, prises et éclairage extérieurs, jardin clos et portail, stationnement, abri de jardin, piscine, temps d'entretien, aménagements possibles (PLU).
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
   - **Travaux** : liste des postes groupés par catégorie, ajout manuel ou depuis barème, bascule artisan/DIY, totaux ; étiquette « Devis retenu » ou « N devis » par poste, bouton « Devis » vers la liste des devis (§13).
   - **Visites** : liste des visites, bouton « Démarrer une visite ».
   - **Pièces** : pièces avec mesures et photos, surface totale calculée.
   - **Suivi** : étape courante (depuis combien de jours, dernière offre), changement d'étape en un tap avec commentaire facultatif, historique daté (chronologie).
   - **Avis** : une carte par personne (étoiles de 1 à 5 — retoucher l'étoile active la retire —, commentaire, bouton N/A · absent·e), moyenne en tête, enregistrement automatique ; l'onglet affiche « répondu/total ».
   - Bouton **Photos** dans l'en-tête : toutes les photos du bien (§14).
   - Bouton **Financement** dans l'en-tête : ouvre le plan de financement du bien (§12).
   - **Plan** : un bloc par niveau, avec l'aperçu du dessin et les plans importés (photo ou fichier). Éditeur plein écran : outils mur, pièce rectangulaire, porte, fenêtre, nom de pièce, équipement ; sélection pour déplacer, étirer, modifier la longueur ou supprimer ; aimant désactivable (grille de 10 cm, extrémités des murs, angles à 0/45/90°) ; cotes affichables ; annuler / rétablir ; pincer pour zoomer ; sauvegarde automatique. Stylet : mode activé automatiquement (le stylet dessine, les doigts déplacent et zooment, la paume est ignorée), réticule aimanté au survol, gomme du stylet, bouton latéral pour sélectionner.
3. **Mode visite** : thèmes en accordéon, pour chaque point des boutons d'état en un tap (OK / À surveiller / Travaux / N/A), commentaire et photo accessibles en un tap, sauvegarde automatique à chaque modification.
4. **Financement** (entrée du menu) : choix du bien, puis le parcours du §12.
5. **Paramètres** : personnes (prénoms), taux notaire, marge par défaut, coefficient DIY, édition du barème, export/import JSON (bloc « Sauvegarde »), état du stockage persistant avec bouton pour le demander.

## 10. Compte rendu PDF

- Généré via une **feuille de style d'impression** et `window.print()` (Chrome Android → « Enregistrer au format PDF »). Pas de librairie PDF.
- Contenu (synthèse brute) : en-tête du bien, budget total décomposé, tableau des postes de travaux, points `TRAVAUX` et `A_SURVEILLER` avec commentaires, pièces et surfaces, vignettes photo des points signalés, notes libres.
- Les points `OK` sont résumés par un compteur par thème, pas listés : tableau « Récapitulatif par thème » (OK, À surveiller, Travaux, N/A, Non vérifiés).
- Page `Compte rendu` du bien (bouton dans l'en-tête de la fiche) : le document s'affiche comme une feuille A4 ; options : visite (la plus récente par défaut, une visite précise ou toutes), photos, plans. Le bouton « Imprimer / PDF » attend que toutes les images soient chargées, puis ouvre l'impression ; le nom du fichier proposé est « Compte rendu - <titre du bien> ».
- Contenu complémentaire : dernière offre, poste de travaux lié à chaque point, plans dessinés avec cotes (étages non vides), notes du bien et de la visite.

## 11. Lotissement

| Lot | Contenu | Critère de fin |
|---|---|---|
| 0 | Socle : projet Angular, PWA (service worker, manifest), Dexie, déploiement GitHub Pages via GitHub Actions | L'appli vide s'installe sur Android et s'ouvre hors ligne |
| 1 | Biens (CRUD), paramètres, barème pré-rempli, postes de travaux, calcul du budget | Budget total correct sur un bien saisi, tests du domaine verts |
| 2 | Mode visite : catalogue de checklist, réponses, pièces et mesures, photos compressées, création de poste depuis un point | Une visite complète se fait hors ligne |
| 3 | Export/import JSON, `storage.persist()` | Export → réinstallation → import restaure tout, photos comprises |
| 4 | Compte rendu PDF | PDF lisible généré depuis Chrome Android |
| 5 | Suivi des étapes et filtres | Historique horodaté visible |
| 6 | Financement : foyer, aides (PTZ, éco-PTZ, CEE, MaPrimeRénov', Action Logement, aides locales), prêts, tableau d'amortissement (§12) | Plan complet et tableau imprimable pour un bien |
| 7 | Devis des postes de travaux, liste des devis, galerie des photos du bien (§13, §14) | Un devis accepté change le budget ; toutes les photos visibles depuis la fiche |
| v2 | Comparatif noté pondéré entre biens | — |

## 12. Financement

Aide à monter le plan de financement d'un bien. **Estimation** : les règles des aides changent souvent (lois de finances, arrêtés) ; elles sont codées dans `domain/regles-aides.ts`, datées (état au 19 octobre 2026), et l'écran rappelle de les confirmer auprès de la banque, de France Rénov' ou de l'ADIL.

### Données
- **Foyer** (dans les réglages, commun à tous les biens) : `occupants`, `revenuFiscalN2` (somme des RFR de l'année N-2, pour le PTZ), `revenuFiscalAnah?` (dernier avis, pour MaPrimeRénov' et les CEE ; à défaut celui de N-2), `revenusNetsMensuels`, `chargesCreditsMensuelles`, `primoAccedant`, `ileDeFrance`, `salariePrive` (entreprise privée d'au moins 10 salariés : Action Logement).
- **PlanFinancement** (table `plansFinancement`, un par bien, `id` = `bienId`, supprimé avec le bien) : type d'achat (`ANCIEN` | `NEUF_INDIVIDUEL`), zone PTZ (`A` = A bis et A, `B1`, `B2`, `C`, choisie à la main avec un lien vers le simulateur de zonage), prix / notaire / travaux (vides = repris du bien ; travaux en hypothèse basse, milieu ou haute de la fourchette, ou saisis), apport, frais (dossier, garantie en % du prêt bancaire, courtage), travaux de rénovation énergétique retenus (« gestes », montants repris des postes du barème correspondants ou saisis), gain de classes DPE, réglage de chaque aide (incluse ou non, montant, durée), aides locales saisies (subvention ou prêt), prêt bancaire (taux, durée, assurance), lissage, primes déduites ou à part, mois de la première échéance. Enregistrement automatique.

### Parcours (6 étapes, résumé toujours visible à droite sur tablette)
1. **Foyer** : questionnaire (personnes, déjà propriétaire ?, revenus, crédits en cours, salarié du privé, Île-de-France), catégorie de revenus Anah affichée.
2. **Projet** : type d'achat, zone, prix, notaire, travaux, apport.
3. **Aides** : gestes de rénovation énergétique, puis une carte par aide avec son statut (*Éligible*, *À vérifier*, *Non éligible*, *À compléter*) et les raisons.
4. **Prêts** : prêt bancaire (taux moyen d'octobre 2026 proposé selon la durée), frais, montage lissé ou empilé, primes déduites ou à part.
5. **Plan** : besoin / financement (équilibrés), mensualité, taux d'endettement et capacité, coût du crédit, TAEG du prêt bancaire, évolution des mensualités, tableau des prêts, points d'attention.
6. **Tableau d'amortissement** : par année ou par mois, tous les prêts ensemble ou un seul ; impression / PDF (plan + tableau mensuel complet).

### Règles (domaine pur, testé unitairement)
- **Besoin** = prix + notaire + travaux + frais de dossier + garantie + courtage. Notaire par défaut : taux des réglages (ancien) ou 2,5 % (neuf).
- **PTZ** : primo-accédant ; neuf toutes zones ; ancien seulement en B2 et C avec des travaux ≥ 25 % du coût total (prix + travaux). Coût retenu = prix + travaux − part financée par l'éco-PTZ, plafonné selon la zone et le nombre d'occupants. Revenu retenu = max(RFR N-2, coût / 9) ; plafond de ressources et tranche (1 à 4) selon le revenu ÷ coefficient familial (1 ; 1,5 ; 1,8 ; 2,1 ; 2,4 ; 2,7 ; 3 ; 3,3). Quotité : 50/40/40/20 % (ancien) ou 30/20/20/10 % (maison neuve). Durée : tranche 1 = 10 ans de différé + 15 ans, 2 = 8 + 12, 3 = 2 + 13, 4 = 0 + 10. Le PTZ ne dépasse pas le total des autres prêts.
- **Éco-PTZ** : logement de plus de 2 ans, sans condition de ressources. Plafond : 7 000 € (fenêtres seules), 15 000 € (une action), 25 000 € (deux), 30 000 € (trois et plus), 10 000 € (assainissement seul), 50 000 € sur 20 ans (performance globale) ; sinon 15 ans au plus. Limité au montant des travaux éligibles.
- **Catégorie Anah** (plafonds 2026, Île-de-France ou autres régions) : très modestes, modestes, intermédiaires, supérieurs.
- **CEE** : pas de barème officiel (prime du fournisseur) : montant saisi, avec un ordre de grandeur par geste.
- **MaPrimeRénov'** : rénovation d'ampleur (DPE E, F ou G, au moins 2 classes gagnées) = taux selon la catégorie (80 / 60 / 45 / 10 %) × travaux HT (TVA 5,5 %) plafonnés à 30 000 € (2 classes) ou 40 000 € (3 et plus), écrêté à 100 / 90 / 80 / 50 % du TTC, CEE déduites. Par geste (depuis le 1er septembre 2026 : pompes à chaleur) : montant saisi, hors revenus supérieurs.
- **Action Logement** (salarié du privé) : prêt accession 30 000 € à 1 % (primo-accédant ; à vérifier dans l'ancien) ; prêt travaux 10 000 € à 1,5 % sur 10 ans au plus. Statut « À vérifier », non inclus par défaut.
- **Prêt bancaire** = besoin − apport − prêts aidés − primes (si déduites) ; la garantie (en % du prêt bancaire) est incluse dans le besoin.
- **Échéancier** : échéance constante, différé total (rien n'est payé) ou partiel (intérêts seuls), assurance = taux annuel × capital initial / 12, payée toute la durée. Dernière échéance ajustée pour solder le prêt. **Lissage** : le prêt bancaire paie la différence pour que le total mensuel (assurances comprises) reste constant pendant sa durée (recherche par dichotomie). Aucun arrondi intermédiaire.
- **Règles bancaires (HCSF)** : alerte au-delà de 35 % d'endettement ((mensualité maximale + crédits en cours) / revenus nets) et au-delà de 25 ans (27 ans pour le neuf ou avec des travaux ≥ 10 % du coût). Autres alertes : apport inférieur aux frais, primes versées après travaux.
- **TAEG** du prêt bancaire : taux actuariel annuel égalisant le montant reçu (capital − frais de dossier, garantie, courtage) et les mensualités assurance comprise.

## 13. Devis

- Un poste de travaux peut avoir **plusieurs devis** à comparer. Un devis peut aussi être saisi sans poste (« pas encore rattaché ») : il ne compte alors pas dans le budget.
- Formulaire : entreprise, montant TTC, poste (avec son estimation), objet, date, fin de validité, statut (*En attente*, *Accepté*, *Refusé*), notes, et le document : photos des pages (appareil photo) ou image / PDF choisis sur l'appareil. Les fichiers choisis ne sont enregistrés qu'avec le devis (Annuler ne laisse rien).
- **Un seul devis accepté par poste** : en accepter un autre fait repasser l'ancien « en attente ». Le devis accepté est recopié sur le poste (`devisRetenu`), dans la même transaction : son montant remplace l'estimation partout (budget, financement, compte rendu). Le formulaire du poste affiche les deux : estimation et devis retenu.
- Supprimer un poste garde ses devis, détachés (et « en attente » s'ils étaient acceptés). Supprimer un devis supprime ses fichiers et retire le devis retenu du poste. Supprimer le bien supprime ses devis.
- **Liste des devis du bien** (bouton « Devis » de l'onglet Travaux) : postes couverts par un devis accepté, total des devis acceptés face à l'estimation de ces postes ; puis un bloc par poste avec ses devis du moins cher au plus cher, position par rapport à l'estimation (sous, dans, au-dessus), étiquettes « Le moins cher » (hors refusés) et « Expiré le … » (en attente et validité dépassée), nombre de fichiers, bouton « Accepter » en un tap ; enfin les devis non rattachés.

## 14. Photos du bien

- Page **Photos** (bouton de l'en-tête de la fiche) : toutes les photos du bien, rangées par provenance — couverture, chaque pièce, chaque visite (libellé du point de checklist sur la vignette), puis les autres. Une photo peut apparaître dans deux groupes (couverture et pièce) ; le total la compte une fois. Filtres Toutes / Pièces / Visites / Autres.
- **Visionneuse** plein écran : photo précédente / suivante (boutons, glisser du doigt, flèches du clavier), position « 3 / 12 », libellé, provenance et date de prise ; lien vers la pièce ou la visite ; « Photo de couverture ». Les photos se suppriment depuis leur pièce ou leur visite.
