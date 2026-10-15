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
}
