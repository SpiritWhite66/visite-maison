import { Categorie, TypeBien } from './modeles';

export interface PointChecklist {
  id: string;
  theme: string;
  libelle: string;
  /** Quoi regarder. */
  aide?: string;
  typesBien: readonly TypeBien[];
  /** Catégorie pré-remplie quand on crée un poste de travaux depuis ce point. */
  categorieTravaux?: Categorie;
}

export interface ThemeChecklist {
  id: string;
  libelle: string;
  typesBien: readonly TypeBien[];
}

const TOUS: readonly TypeBien[] = ['VILLE', 'RURAL'];
const RURAL: readonly TypeBien[] = ['RURAL'];

/** Thèmes, dans l'ordre d'affichage. */
export const THEMES_CHECKLIST: readonly ThemeChecklist[] = [
  { id: 'structure', libelle: 'Structure et extérieur', typesBien: TOUS },
  { id: 'jardin', libelle: 'Jardin et extérieur', typesBien: TOUS },
  { id: 'toiture', libelle: 'Toiture et charpente', typesBien: TOUS },
  { id: 'humidite', libelle: 'Humidité', typesBien: TOUS },
  { id: 'menuiseries', libelle: 'Menuiseries', typesBien: TOUS },
  { id: 'electricite', libelle: 'Électricité', typesBien: TOUS },
  { id: 'plomberie', libelle: 'Plomberie et eau chaude', typesBien: TOUS },
  { id: 'pieces-vie', libelle: 'Pièces de vie', typesBien: TOUS },
  { id: 'cuisine-sdb', libelle: 'Cuisine et salle de bain', typesBien: TOUS },
  { id: 'environnement', libelle: 'Environnement', typesBien: TOUS },
  { id: 'risques', libelle: 'Risques et administratif', typesBien: TOUS },
  { id: 'assainissement', libelle: 'Assainissement', typesBien: RURAL },
  { id: 'terrain', libelle: 'Terrain, clôtures, dépendances', typesBien: RURAL },
  { id: 'eau', libelle: 'Eau', typesBien: RURAL },
  { id: 'chauffage-dpe', libelle: 'Chauffage bois, isolation, DPE', typesBien: RURAL },
];

function p(
  theme: string,
  id: string,
  libelle: string,
  aide?: string,
  categorieTravaux?: Categorie,
): PointChecklist {
  const typesBien = THEMES_CHECKLIST.find((t) => t.id === theme)?.typesBien ?? TOUS;
  return { id: `${theme}.${id}`, theme, libelle, aide, typesBien, categorieTravaux };
}

/**
 * Catalogue statique de la visite (SPEC §8). Les identifiants sont stockés dans les visites :
 * ne jamais les renommer, seulement en ajouter.
 */
export const CHECKLIST_CATALOGUE: readonly PointChecklist[] = [
  // Structure et extérieur
  p('structure', 'fissures-facade', 'Fissures en façade', 'Largeur, en escalier ou verticales, anciennes ou récentes ?', 'Gros œuvre'),
  p('structure', 'enduit', 'État de l’enduit', 'Cloques, décollements, zones qui sonnent creux.', 'Extérieur'),
  p('structure', 'gouttieres', 'Gouttières et descentes', 'Fuites, pentes, descentes branchées sur un réseau.', 'Toiture'),
  p('structure', 'fondations', 'Fondations visibles', 'Soubassement, fissures horizontales, tassements.', 'Gros œuvre'),
  p('structure', 'mitoyennete', 'Mitoyenneté', 'Murs mitoyens, droits de passage, nuisances.'),

  // Jardin et extérieur
  p('jardin', 'surface', 'Surface et forme du jardin', 'Surface vraiment utilisable, forme, recoins perdus, talus.'),
  p('jardin', 'exposition', 'Exposition et ensoleillement', 'Orientation, heures de soleil, ombre des voisins et des arbres.'),
  p('jardin', 'vis-a-vis', 'Vis-à-vis et intimité', 'Vues depuis les voisins ou la rue, haies, murs.'),
  p('jardin', 'terrasse', 'Terrasse', 'Surface, état, exposition, accès de plain-pied depuis le séjour ou la cuisine.', 'Extérieur'),
  p('jardin', 'sol', 'Nature du sol', 'Terre, cailloux, argile ; flaques ou zones détrempées après la pluie.', 'Extérieur'),
  p('jardin', 'plantations', 'Arbres, haies et plantations', 'Essences, état, fruitiers, arbres à abattre, haies à tailler.', 'Extérieur'),
  p('jardin', 'potager', 'Place pour un potager', 'Coin ensoleillé, accès à l’eau, terre cultivable.'),
  p('jardin', 'point-eau', 'Point d’eau extérieur', 'Robinet, arrosage, récupérateur d’eau de pluie.', 'Plomberie'),
  p('jardin', 'electricite', 'Prises et éclairage extérieurs', 'Prises étanches, éclairage, gaine vers le fond du jardin.', 'Électricité'),
  p('jardin', 'cloture', 'Jardin clos et portail', 'Clôture continue pour enfants et animaux, portail, portillon.', 'Extérieur'),
  p('jardin', 'stationnement', 'Stationnement', 'Garage, places dans la cour, recharge de voiture électrique.', 'Extérieur'),
  p('jardin', 'abri', 'Abri de jardin et rangement', 'Où ranger tondeuse, vélos, outils, bois ?', 'Extérieur'),
  p('jardin', 'piscine', 'Piscine', 'Type, état, local technique, sécurité (alarme, barrière, abri). N/A s’il n’y en a pas.', 'Extérieur'),
  p('jardin', 'entretien', 'Temps d’entretien', 'Pelouse, haies, feuilles : combien d’heures par mois ?'),
  p('jardin', 'amenagements', 'Aménagements possibles', 'Extension, véranda, piscine, abri : vérifier le PLU (emprise au sol, reculs).'),

  // Toiture et charpente
  p('toiture', 'tuiles', 'État des tuiles vu du sol', 'Tuiles cassées ou déplacées, mousse, affaissement.', 'Toiture'),
  p('toiture', 'faitage', 'Faîtage', 'Alignement, solins, tuiles de rive.', 'Toiture'),
  p('toiture', 'combles-eau-insectes', 'Combles : traces d’eau, insectes', 'Auréoles, bois piqué, sciure, galeries.', 'Toiture'),
  p('toiture', 'combles-isolation', 'Combles : isolation présente', 'Type et épaisseur.', 'Isolation'),
  p('toiture', 'age-couverture', 'Âge de la couverture', 'Date de la dernière réfection, factures.', 'Toiture'),

  // Humidité
  p('humidite', 'bas-murs', 'Traces au bas des murs', 'Auréoles, peinture qui cloque, plinthes abîmées.', 'Humidité'),
  p('humidite', 'salpetre', 'Salpêtre', 'Dépôts blanchâtres sur les murs.', 'Humidité'),
  p('humidite', 'moisi', 'Odeur de moisi', 'Fermer les portes un instant, sentir.', 'Humidité'),
  p('humidite', 'ventilation', 'Ventilation', 'Grilles, VMC, aérations dans les pièces d’eau.', 'Ventilation'),
  p('humidite', 'cave-vide-sanitaire', 'Cave / vide sanitaire', 'Humidité, aération, accès.', 'Humidité'),

  // Menuiseries
  p('menuiseries', 'vitrage', 'Simple / double vitrage', 'Buée entre les vitres, âge, étanchéité.', 'Menuiseries'),
  p('menuiseries', 'bois', 'État des bois', 'Pourriture en bas de cadre, peinture, jeu.', 'Menuiseries'),
  p('menuiseries', 'volets', 'Volets', 'Fonctionnement, état, motorisation.', 'Menuiseries'),

  // Électricité
  p('electricite', 'tableau', 'Âge du tableau', 'Fusibles à broches, disjoncteurs récents ?', 'Électricité'),
  p('electricite', 'differentiel', 'Disjoncteur différentiel 30 mA', undefined, 'Électricité'),
  p('electricite', 'prises-terre', 'Prises avec terre', 'Tester quelques prises, présence de la terre.', 'Électricité'),
  p('electricite', 'diagnostic', 'Diagnostic électrique', 'Fourni ? Anomalies relevées.', 'Électricité'),

  // Plomberie et eau chaude
  p('plomberie', 'pression', 'Pression', 'Ouvrir plusieurs robinets en même temps.', 'Plomberie'),
  p('plomberie', 'chauffe-eau', 'Type et âge du chauffe-eau', 'Plaque signalétique, capacité.', 'Plomberie'),
  p('plomberie', 'canalisations', 'Canalisations visibles', 'Plomb, galva, fuites, corrosion.', 'Plomberie'),

  // Pièces de vie
  p('pieces-vie', 'luminosite', 'Luminosité'),
  p('pieces-vie', 'orientation', 'Orientation'),
  p('pieces-vie', 'hauteur', 'Hauteur sous plafond'),
  p('pieces-vie', 'agencement', 'Agencement', 'Circulations, cloisons à déplacer.'),

  // Cuisine et salle de bain
  p('cuisine-sdb', 'cuisine', 'Cuisine', 'Réutilisable ou à refaire ?', 'Cuisine'),
  p('cuisine-sdb', 'salle-de-bain', 'Salle de bain', 'Réutilisable ou à refaire ?', 'Plomberie'),

  // Environnement
  p('environnement', 'bruit', 'Bruit'),
  p('environnement', 'voisinage', 'Voisinage'),
  p('environnement', 'reseau-mobile', 'Réseau mobile', 'Barres de réseau dans la maison et le jardin.'),
  p('environnement', 'commerces', 'Commerces'),
  p('environnement', 'trajet', 'Trajet', 'Temps réel jusqu’au travail, aux écoles, aux services.'),

  // Risques et administratif
  p('risques', 'diagnostics', 'Diagnostics fournis', 'DPE, amiante, plomb, termites, électricité, gaz.'),
  p('risques', 'argiles', 'Retrait-gonflement des argiles', 'À consulter sur Géorisques.'),
  p('risques', 'inondation', 'Risque d’inondation', 'À consulter sur Géorisques.'),
  p('risques', 'plu', 'PLU', 'Zone, règles de construction et d’extension.'),
  p('risques', 'servitudes', 'Servitudes'),
  p('risques', 'taxe-fonciere', 'Taxe foncière', 'Montant du dernier avis.'),

  // Rural : assainissement
  p('assainissement', 'raccordement', 'Tout-à-l’égout ou ANC', 'Raccordé au réseau ou assainissement non collectif ?', 'Assainissement'),
  p('assainissement', 'anc-type', 'ANC : type', 'Fosse septique, toutes eaux, filtre, micro-station.', 'Assainissement'),
  p('assainissement', 'anc-spanc', 'ANC : dernier contrôle SPANC', 'Date et avis du rapport.', 'Assainissement'),
  p('assainissement', 'anc-conformite', 'ANC : conformité', undefined, 'Assainissement'),
  p('assainissement', 'anc-epandage', 'ANC : emplacement de l’épandage', 'Pas de plantation ni de circulation dessus.', 'Assainissement'),
  p('assainissement', 'anc-odeurs', 'ANC : odeurs', undefined, 'Assainissement'),

  // Rural : terrain, clôtures, dépendances
  p('terrain', 'bornage', 'Bornage', 'Bornes présentes, plan de bornage.'),
  p('terrain', 'acces', 'Accès et chemin', 'Privé ou servitude ? Entretien, praticabilité en hiver.'),
  p('terrain', 'clotures', 'Clôtures existantes', 'État et longueur à refaire.', 'Extérieur'),
  p('terrain', 'dependances', 'Granges et dépendances', 'Toiture, structure, usage possible.', 'Gros œuvre'),
  p('terrain', 'arbres', 'Arbres proches de la maison', 'Racines, branches sur la toiture.', 'Extérieur'),
  p('terrain', 'pente-ecoulement', 'Pente et écoulement des eaux', 'Où va l’eau de pluie ?', 'Extérieur'),

  // Rural : eau
  p('eau', 'reseau', 'Raccordement au réseau', undefined, 'Eau'),
  p('eau', 'puits-forage', 'Puits ou forage', 'Déclaré en mairie ? Analyse d’eau disponible ?', 'Eau'),
  p('eau', 'pluie', 'Récupération d’eau de pluie', undefined, 'Eau'),
  p('eau', 'compteur', 'Compteur', undefined, 'Eau'),

  // Rural : chauffage bois, isolation, DPE
  p('chauffage-dpe', 'mode', 'Mode de chauffage', undefined, 'Chauffage'),
  p('chauffage-dpe', 'poele-insert', 'Poêle ou insert', 'Âge, état du conduit.', 'Chauffage'),
  p('chauffage-dpe', 'ramonage', 'Certificat de ramonage', undefined, 'Chauffage'),
  p('chauffage-dpe', 'isolation', 'Isolation des combles et des murs', undefined, 'Isolation'),
  p('chauffage-dpe', 'dpe', 'Classe DPE et date du diagnostic', undefined),
  p('chauffage-dpe', 'consommation', 'Consommation annoncée'),
];
