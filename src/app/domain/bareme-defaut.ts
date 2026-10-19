import { Categorie, LigneBareme, PrixGamme, UniteBareme } from './modeles';

type Fourchette = readonly [bas: number, haut: number];

/** `eco` et `haut` : bas de gamme et haut de gamme ; le prix principal est le moyen de gamme. */
function ligne(
  n: number,
  categorie: Categorie,
  libelle: string,
  unite: UniteBareme,
  [prixBas, prixHaut]: Fourchette,
  gammes?: { eco: Fourchette; haut: Fourchette },
): LigneBareme {
  const prix = ([bas, haut]: Fourchette): PrixGamme => ({ prixBas: bas, prixHaut: haut });
  return {
    id: `bareme-${String(n).padStart(2, '0')}`,
    categorie,
    libelle,
    unite,
    prixBas,
    prixHaut,
    ...(gammes ? { gammes: { ECO: prix(gammes.eco), HAUT: prix(gammes.haut) } } : {}),
  };
}

/**
 * Barème indicatif (SPEC §6) : prix artisan TTC fourni-posé, à ajuster dans Paramètres.
 * Lignes 1 à 28 : barème d'origine (prix inchangés = moyen de gamme). Lignes 29 et suivantes : ajoutées avec les gammes.
 * Les identifiants sont stockés dans les postes : ne jamais les renuméroter.
 */
export const BAREME_DEFAUT: readonly LigneBareme[] = [
  // Toiture
  ligne(1, 'Toiture', 'Réfection complète couverture tuiles', 'M2', [120, 250], { eco: [90, 150], haut: [200, 350] }),
  ligne(2, 'Toiture', 'Révision / remplacement tuiles ponctuel', 'FORFAIT', [500, 2500]),
  ligne(3, 'Toiture', 'Traitement charpente', 'M2', [20, 40]),
  ligne(29, 'Toiture', 'Démoussage et hydrofuge de toiture', 'M2', [15, 35]),
  ligne(30, 'Toiture', 'Gouttières et descentes', 'ML', [40, 90], { eco: [25, 45], haut: [80, 150] }),
  ligne(31, 'Toiture', 'Fenêtre de toit (type Velux)', 'UNITE', [900, 2000], { eco: [600, 1100], haut: [1800, 3500] }),

  // Isolation
  ligne(4, 'Isolation', 'Combles perdus (soufflage)', 'M2', [25, 50]),
  ligne(5, 'Isolation', 'Murs par l\'intérieur', 'M2', [50, 100], { eco: [40, 70], haut: [80, 130] }),
  ligne(6, 'Isolation', 'Murs par l\'extérieur (ITE)', 'M2', [120, 200], { eco: [100, 150], haut: [180, 260] }),
  ligne(32, 'Isolation', 'Rampants / sous toiture', 'M2', [50, 110], { eco: [40, 70], haut: [90, 150] }),
  ligne(33, 'Isolation', 'Plancher bas (sous-sol, vide sanitaire)', 'M2', [30, 70]),

  // Menuiseries
  ligne(7, 'Menuiseries', 'Fenêtre double vitrage', 'UNITE', [600, 1200], { eco: [400, 700], haut: [1100, 2000] }),
  ligne(8, 'Menuiseries', 'Porte d\'entrée', 'UNITE', [1500, 4000], { eco: [900, 1600], haut: [3500, 7000] }),
  ligne(34, 'Menuiseries', 'Porte-fenêtre / baie vitrée', 'UNITE', [1500, 3500], { eco: [900, 1700], haut: [3000, 7000] }),
  ligne(35, 'Menuiseries', 'Volet roulant', 'UNITE', [450, 1100], { eco: [300, 550], haut: [900, 1800] }),
  ligne(36, 'Menuiseries', 'Porte intérieure', 'UNITE', [300, 700], { eco: [180, 350], haut: [600, 1300] }),
  ligne(37, 'Menuiseries', 'Porte de garage', 'UNITE', [1200, 3500], { eco: [800, 1500], haut: [3000, 6000] }),

  // Électricité
  ligne(9, 'Électricité', 'Rénovation complète', 'M2', [80, 140]),
  ligne(10, 'Électricité', 'Mise en sécurité tableau', 'FORFAIT', [1000, 2500]),
  ligne(38, 'Électricité', 'Ajout prise ou point lumineux', 'UNITE', [80, 200]),

  // Plomberie
  ligne(11, 'Plomberie', 'Salle de bain complète', 'FORFAIT', [6000, 15000], { eco: [4000, 8000], haut: [12000, 25000] }),
  ligne(12, 'Plomberie', 'Remplacement chauffe-eau', 'FORFAIT', [800, 2500]),
  ligne(39, 'Plomberie', 'Chauffe-eau thermodynamique', 'FORFAIT', [2500, 4500]),
  ligne(40, 'Plomberie', 'Douche à l\'italienne', 'FORFAIT', [3000, 7000], { eco: [2000, 4000], haut: [6000, 12000] }),
  ligne(41, 'Plomberie', 'Remplacement WC', 'UNITE', [400, 1000], { eco: [250, 500], haut: [900, 2000] }),
  ligne(42, 'Plomberie', 'Réfection réseau d\'eau (cuivre / PER)', 'FORFAIT', [2000, 6000]),

  // Cuisine
  ligne(13, 'Cuisine', 'Cuisine équipée posée', 'FORFAIT', [4000, 15000], { eco: [2500, 6000], haut: [12000, 30000] }),
  ligne(43, 'Cuisine', 'Rafraîchissement (façades, plan de travail)', 'FORFAIT', [1500, 5000], { eco: [800, 2000], haut: [4000, 9000] }),

  // Chauffage
  ligne(14, 'Chauffage', 'Poêle à bois posé avec conduit', 'FORFAIT', [3000, 7000], { eco: [2000, 4000], haut: [6000, 12000] }),
  ligne(15, 'Chauffage', 'Pompe à chaleur air/eau', 'FORFAIT', [10000, 18000], { eco: [8000, 12000], haut: [15000, 22000] }),
  ligne(44, 'Chauffage', 'Chaudière gaz à condensation', 'FORFAIT', [4000, 8000], { eco: [3000, 5000], haut: [7000, 11000] }),
  ligne(45, 'Chauffage', 'Radiateur électrique performant', 'UNITE', [400, 1100], { eco: [200, 450], haut: [900, 1800] }),
  ligne(46, 'Chauffage', 'Tubage de conduit de cheminée', 'FORFAIT', [1200, 2500]),

  // Ventilation
  ligne(16, 'Ventilation', 'VMC simple flux', 'FORFAIT', [800, 2000]),
  ligne(47, 'Ventilation', 'VMC double flux', 'FORFAIT', [4000, 8000]),

  // Sols
  ligne(17, 'Sols', 'Carrelage posé', 'M2', [50, 100], { eco: [35, 60], haut: [90, 180] }),
  ligne(18, 'Sols', 'Parquet posé', 'M2', [40, 90], { eco: [30, 50], haut: [80, 160] }),
  ligne(48, 'Sols', 'Sol stratifié posé', 'M2', [25, 55], { eco: [18, 30], haut: [45, 75] }),
  ligne(49, 'Sols', 'Sol vinyle / PVC posé', 'M2', [25, 60], { eco: [18, 32], haut: [50, 90] }),
  ligne(50, 'Sols', 'Ragréage', 'M2', [15, 30]),

  // Finitions
  ligne(19, 'Finitions', 'Peinture murs et plafonds', 'M2', [25, 45], { eco: [18, 30], haut: [40, 70] }),
  ligne(51, 'Finitions', 'Cloison en plaques de plâtre', 'M2', [40, 80]),
  ligne(52, 'Finitions', 'Faux plafond', 'M2', [40, 80]),

  // Humidité
  ligne(20, 'Humidité', 'Traitement remontées capillaires', 'ML', [100, 250]),
  ligne(53, 'Humidité', 'Drainage périphérique', 'ML', [80, 200]),

  // Assainissement
  ligne(21, 'Assainissement', 'Installation ANC (filtre / micro-station)', 'FORFAIT', [7000, 15000]),
  ligne(22, 'Assainissement', 'Raccordement tout-à-l\'égout', 'FORFAIT', [3000, 10000]),
  ligne(54, 'Assainissement', 'Vidange de fosse', 'FORFAIT', [200, 450]),

  // Eau
  ligne(23, 'Eau', 'Forage', 'FORFAIT', [5000, 15000]),
  ligne(24, 'Eau', 'Récupérateur eau de pluie enterré', 'FORFAIT', [2000, 6000]),
  ligne(55, 'Eau', 'Analyse d\'eau (puits, forage)', 'FORFAIT', [100, 300]),
  ligne(56, 'Eau', 'Adoucisseur d\'eau', 'FORFAIT', [1000, 2500]),

  // Extérieur
  ligne(25, 'Extérieur', 'Clôture grillage rigide', 'ML', [40, 90], { eco: [25, 45], haut: [80, 150] }),
  ligne(26, 'Extérieur', 'Portail', 'UNITE', [1500, 5000], { eco: [800, 1800], haut: [4000, 9000] }),
  ligne(57, 'Extérieur', 'Ravalement de façade', 'M2', [40, 100], { eco: [30, 50], haut: [80, 150] }),
  ligne(58, 'Extérieur', 'Terrasse bois', 'M2', [100, 220], { eco: [70, 120], haut: [180, 320] }),
  ligne(59, 'Extérieur', 'Terrasse carrelée ou béton', 'M2', [80, 180], { eco: [50, 100], haut: [150, 280] }),
  ligne(60, 'Extérieur', 'Abattage d\'arbre', 'UNITE', [400, 1500]),
  ligne(61, 'Extérieur', 'Allée ou cour gravillonnée', 'M2', [20, 50]),

  // Gros œuvre
  ligne(27, 'Gros œuvre', 'Reprise de fissures / maçonnerie', 'FORFAIT', [1000, 10000]),
  ligne(28, 'Gros œuvre', 'Démolition et évacuation', 'FORFAIT', [1000, 5000]),
  ligne(62, 'Gros œuvre', 'Ouverture dans un mur porteur', 'FORFAIT', [3000, 8000]),
  ligne(63, 'Gros œuvre', 'Dalle béton', 'M2', [60, 120]),

  // Autre
  ligne(64, 'Autre', 'Désamiantage', 'FORFAIT', [2000, 8000]),
  ligne(65, 'Autre', 'Traitement anti-termites', 'FORFAIT', [1500, 3500]),
];
