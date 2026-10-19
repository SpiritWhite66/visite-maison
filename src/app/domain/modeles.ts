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

/** Niveau de finition d'un poste : bas, moyen (par défaut) ou haut de gamme. */
export const GAMMES = ['ECO', 'STANDARD', 'HAUT'] as const;
export type Gamme = (typeof GAMMES)[number];
export const GAMME_DEFAUT: Gamme = 'STANDARD';

export interface PrixGamme {
  prixBas: number;
  prixHaut: number;
}

export interface LigneBareme {
  id: string;
  categorie: Categorie;
  libelle: string;
  unite: UniteBareme;
  /** Prix du moyen de gamme (gamme par défaut). */
  prixBas: number;
  prixHaut: number;
  coefDiy?: number;
  /**
   * Prix des autres gammes, quand le choix a un sens (parquet, cuisine, fenêtres…).
   * Une gamme absente retombe sur le moyen de gamme.
   */
  gammes?: Partial<Record<'ECO' | 'HAUT', PrixGamme>>;
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
  /** Si `BAREME` : gamme retenue ; absente = moyen de gamme. */
  gamme?: Gamme;
  realisation: Realisation;
  montantBas: number;
  montantHaut: number;
  priorite: Priorite;
  notes?: string;
  /** Devis accepté pour ce poste : son montant remplace l'estimation (bas = haut). */
  devisRetenu?: { devisId: string; montant: number };
}

export interface Parametres {
  tauxNotairePct: number;
  margeNegociationDefautPct: number;
  coefDiyDefaut: number;
  /** Date de la dernière sauvegarde (export JSON) ; sert à rappeler d'en refaire une. */
  derniereSauvegarde?: string;
  /** Foyer emprunteur (financement), commun à tous les biens. */
  foyer?: Foyer;
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

/* ---------- Personnes et avis ---------- */

/** Une personne qui visite les biens (déclarée dans Paramètres) et donne son avis. */
export interface Personne {
  id: string;
  prenom: string;
}

/**
 * Avis d'une personne sur un bien. Un avis absent veut dire « pas encore donné » ;
 * `absente` correspond au N/A : la personne n'était pas là.
 */
export interface Avis {
  /** `bienId:personneId` : un seul avis par personne et par bien. */
  id: string;
  bienId: string;
  personneId: string;
  absente: boolean;
  /** 1 à 5, ou `null` si la personne n'a pas mis d'étoiles. */
  etoiles: number | null;
  commentaire: string;
  modifieLe: string;
}

// ---------- Financement (SPEC §12) ----------

/** Foyer emprunteur : rempli une fois, sert pour tous les biens. */
export interface Foyer {
  /** Personnes qui occuperont le logement. */
  occupants: number;
  /** Somme des revenus fiscaux de référence de l'année N-2 (PTZ). */
  revenuFiscalN2: number;
  /** Revenu fiscal du dernier avis d'imposition (Anah : MaPrimeRénov', CEE) ; à défaut celui de N-2. */
  revenuFiscalAnah: number | null;
  /** Revenus nets mensuels du foyer, avant impôt sur le revenu. */
  revenusNetsMensuels: number;
  /** Mensualités de crédits déjà en cours (auto, consommation…). */
  chargesCreditsMensuelles: number;
  /** Pas propriétaire de sa résidence principale au cours des 2 dernières années (ou cas d'exception). */
  primoAccedant: boolean;
  ileDeFrance: boolean;
  /** Au moins un emprunteur salarié d'une entreprise privée non agricole d'au moins 10 salariés. */
  salariePrive: boolean;
}

export type TypeOperation = 'ANCIEN' | 'NEUF_INDIVIDUEL';
export type HypotheseTravaux = 'BAS' | 'MILIEU' | 'HAUT';

export const TYPES_GESTE = [
  'ISOLATION_TOITURE',
  'ISOLATION_MURS',
  'ISOLATION_PLANCHER',
  'FENETRES',
  'PAC_AIR_EAU',
  'PAC_GEOTHERMIE',
  'CHAUFFAGE_BOIS',
  'CHAUFFE_EAU_THERMO',
  'VMC_DOUBLE_FLUX',
  'ASSAINISSEMENT',
] as const;
export type TypeGeste = (typeof TYPES_GESTE)[number];

/** Travaux de rénovation énergétique retenus pour les aides. `montant` à `null` : repris des postes de travaux. */
export interface GestePlan {
  type: TypeGeste;
  montant: number | null;
}

/** Prêt aidé : `montant` à `null` = le maximum possible. */
export interface ReglagePret {
  inclus: boolean;
  montant: number | null;
  /** Durée choisie (sinon la durée maximale). */
  dureeMois: number | null;
}

export interface AideLocale {
  id: string;
  libelle: string;
  nature: 'SUBVENTION' | 'PRET';
  montant: number;
  tauxPct: number;
  dureeMois: number;
}

export interface PlanFinancement {
  /** Un plan par bien : identifiant = celui du bien. */
  id: string;
  bienId: string;
  typeOperation: TypeOperation;
  zone: 'A' | 'B1' | 'B2' | 'C' | null;
  hypotheseTravaux: HypotheseTravaux;
  /** Valeurs reprises du bien quand elles sont à `null`. */
  prixAchat: number | null;
  fraisNotaire: number | null;
  travaux: number | null;
  apport: number;
  fraisDossier: number;
  tauxGarantiePct: number;
  fraisCourtage: number;
  gestes: GestePlan[];
  /** Classes DPE gagnées après travaux (rénovation d'ampleur, éco-PTZ performance globale). */
  gainClasses: number;
  ptz: ReglagePret;
  ecoPtz: ReglagePret & { performanceGlobale: boolean };
  actionLogementAccession: ReglagePret;
  actionLogementTravaux: ReglagePret;
  cee: { inclus: boolean; montant: number };
  maPrimeRenov: { inclus: boolean; parcours: 'AMPLEUR' | 'GESTE'; montant: number | null };
  aidesLocales: AideLocale[];
  /** Les primes (CEE, MaPrimeRénov', subventions) réduisent le prêt bancaire ; elles sont versées après travaux. */
  primesDeduites: boolean;
  banque: { tauxPct: number; dureeMois: number; tauxAssurancePct: number };
  lisser: boolean;
  /** Mois de la première échéance, « AAAA-MM ». */
  premiereEcheance: string;
  modifieLe: string;
}

// ---------- Devis ----------

export type StatutDevis = 'EN_ATTENTE' | 'ACCEPTE' | 'REFUSE';

/** Devis d'une entreprise, rattaché à un poste de travaux (ou pas encore). */
export interface Devis {
  id: string;
  bienId: string;
  /** `null` : devis pas encore rattaché à un poste. */
  posteId: string | null;
  entreprise: string;
  /** Objet du devis, s'il diffère du poste. */
  objet: string;
  montantTtc: number;
  /** Date du devis, AAAA-MM-JJ. */
  date: string;
  /** Fin de validité, AAAA-MM-JJ. */
  valableJusquau: string | null;
  statut: StatutDevis;
  notes: string;
  ajouteLe: string;
  modifieLe: string;
}

/** Page ou pièce jointe d'un devis : photo réduite à 2400 px ou fichier tel quel (PDF). */
export interface FichierDevis {
  id: string;
  bienId: string;
  devisId: string;
  nom: string;
  typeMime: string;
  blob: Blob;
  ajouteLe: string;
}
