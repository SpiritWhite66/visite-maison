export type TypeBien = 'VILLE' | 'RURAL';
export type NoteEnergie = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export const ETAPES = [
  'REPERE',
  'VISITE_PLANIFIEE',
  'VISITE',
  'CONTRE_VISITE',
  'OFFRE_FAITE',
  'OFFRE_ACCEPTEE',
  'COMPROMIS',
  'OFFRE_REFUSEE',
  'ABANDONNE',
] as const;
export type Etape = (typeof ETAPES)[number];

export interface EntreeHistorique {
  etape: Etape;
  date: string;
  commentaire?: string;
  /** Montant de l'offre, pour l'étape `OFFRE_FAITE`. */
  montant?: number;
}

export interface Contact {
  nom: string;
  agence?: string;
  telephone?: string;
  email?: string;
}

export interface Bien {
  id: string;
  titre: string;
  typeBien: TypeBien;
  urlAnnonce?: string;
  adresse: string;
  commune: string;
  contact: Contact;
  prixAffiche: number;
  margeNegociationPct: number;
  surfaceHabitable?: number;
  surfaceTerrain?: number;
  anneeConstruction?: number;
  dpe: NoteEnergie | null;
  ges: NoteEnergie | null;
  etape: Etape;
  historiqueEtapes: EntreeHistorique[];
  impressionGlobale: number | null;
  /** Photo affichée sur la carte du bien dans la liste. */
  photoCouvertureId?: string;
  notes: string;
  creeLe: string;
  modifieLe: string;
}

export const CATEGORIES = [
  'Toiture',
  'Isolation',
  'Menuiseries',
  'Électricité',
  'Plomberie',
  'Cuisine',
  'Chauffage',
  'Ventilation',
  'Sols',
  'Finitions',
  'Humidité',
  'Assainissement',
  'Eau',
  'Extérieur',
  'Gros œuvre',
  'Autre',
] as const;
export type Categorie = (typeof CATEGORIES)[number];

export type UniteBareme = 'M2' | 'ML' | 'UNITE' | 'FORFAIT';

export interface LigneBareme {
  id: string;
  categorie: Categorie;
  libelle: string;
  unite: UniteBareme;
  prixBas: number;
  prixHaut: number;
  coefDiy?: number;
}

export type ModeChiffrage = 'MANUEL' | 'BAREME';
export type Realisation = 'ARTISAN' | 'DIY';
export type Priorite = 'URGENT' | 'COURT_TERME' | 'CONFORT';

export interface PosteTravaux {
  id: string;
  bienId: string;
  categorie: Categorie;
  libelle: string;
  modeChiffrage: ModeChiffrage;
  baremeId?: string;
  quantite?: number;
  realisation: Realisation;
  montantBas: number;
  montantHaut: number;
  priorite: Priorite;
  notes?: string;
}

export interface Parametres {
  tauxNotairePct: number;
  margeNegociationDefautPct: number;
  coefDiyDefaut: number;
  /** Date de la dernière sauvegarde (export JSON) ; sert à rappeler d'en refaire une. */
  derniereSauvegarde?: string;
}

export type TypeVisite = 'PREMIERE' | 'CONTRE_VISITE';
export type EtatPoint = 'OK' | 'A_SURVEILLER' | 'TRAVAUX' | 'NA' | 'NON_VERIFIE';

export interface ReponseChecklist {
  pointId: string;
  etat: EtatPoint;
  commentaire?: string;
  photoIds: string[];
  posteTravauxId?: string;
}

export interface Visite {
  id: string;
  bienId: string;
  date: string;
  typeVisite: TypeVisite;
  /** Seuls les points touchés sont enregistrés : un point absent est `NON_VERIFIE`. */
  reponses: ReponseChecklist[];
  notes: string;
}

export interface Piece {
  id: string;
  bienId: string;
  nom: string;
  longueur?: number;
  largeur?: number;
  surface?: number;
  hauteurSousPlafond?: number;
  photoIds: string[];
  notes: string;
}

export interface Photo {
  id: string;
  bienId: string;
  /** JPEG compressé. */
  blob: Blob;
  legende?: string;
  prisLe: string;
}

/* ---------- Plan (étages dessinés et fichiers de plan) ---------- */

export interface Mur {
  type: 'MUR';
  id: string;
  /** Coordonnées en mètres, axe y vers le bas. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  epaisseur: number;
}

/** Porte ou fenêtre, accrochée à un mur : elle le suit quand il bouge et disparaît avec lui. */
export interface Ouverture {
  type: 'PORTE' | 'FENETRE';
  id: string;
  murId: string;
  /** Position du milieu de l'ouverture le long du mur, de 0 (début) à 1 (fin). */
  t: number;
  largeur: number;
  /** Côté du mur vers lequel la porte s'ouvre. */
  cote: 1 | -1;
  /** Charnière à l'extrémité « fin » de l'ouverture plutôt qu'au « début ». */
  charniereFin: boolean;
}

export interface EtiquettePlan {
  type: 'ETIQUETTE';
  id: string;
  x: number;
  y: number;
  texte: string;
  /** Pièce de l'onglet Pièces : sa surface s'affiche sous le nom. */
  pieceId?: string;
}

export const NATURES_EQUIPEMENT = ['ECS', 'TABLEAU_ELECTRIQUE', 'CHAUFFAGE', 'COMPTEUR_EAU'] as const;
export type NatureEquipement = (typeof NATURES_EQUIPEMENT)[number];

export interface EquipementPlan {
  type: 'EQUIPEMENT';
  id: string;
  x: number;
  y: number;
  nature: NatureEquipement;
}

export type ElementPlan = Mur | Ouverture | EtiquettePlan | EquipementPlan;

export interface Etage {
  id: string;
  bienId: string;
  nom: string;
  ordre: number;
  elements: ElementPlan[];
}

/** Plan importé (photo ou fichier, PDF compris) rattaché à un étage. */
export interface FichierPlan {
  id: string;
  bienId: string;
  etageId: string;
  nom: string;
  typeMime: string;
  blob: Blob;
  ajouteLe: string;
}
