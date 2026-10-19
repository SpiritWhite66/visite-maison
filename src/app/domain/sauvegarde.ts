import { Avis, Bien, Devis, Etage, FichierDevis, FichierPlan, LigneBareme, Parametres, Personne, Photo, Piece, PlanFinancement, PosteTravaux, Visite } from './modeles';

/** Toutes les données de l'appli, telles qu'elles sont en base (les images restent des `Blob`). */
export interface DonneesBase {
  biens: Bien[];
  postesTravaux: PosteTravaux[];
  visites: Visite[];
  pieces: Piece[];
  etages: Etage[];
  bareme: LigneBareme[];
  parametres?: Parametres;
  photos: Photo[];
  fichiersPlan: FichierPlan[];
  personnes: Personne[];
  avis: Avis[];
  plansFinancement: PlanFinancement[];
  devis: Devis[];
  fichiersDevis: FichierDevis[];
}

export const FORMAT_SAUVEGARDE = 'visite-immo';
/** À incrémenter si le fichier change de forme ; les anciennes versions restent lisibles. */
export const VERSION_FORMAT = 1;

/** Images et fichiers sont écrits en base 64 dans le JSON (`donnees`), avec leur type MIME. */
export type PhotoExportee = Omit<Photo, 'blob'> & { type: string; donnees: string };
export type FichierPlanExporte = Omit<FichierPlan, 'blob'> & { donnees: string };
export type FichierDevisExporte = Omit<FichierDevis, 'blob'> & { donnees: string };

/** Contenu du fichier de sauvegarde. */
export interface Sauvegarde extends Omit<DonneesBase, 'photos' | 'fichiersPlan' | 'fichiersDevis'> {
  format: typeof FORMAT_SAUVEGARDE;
  version: number;
  exporteLe: string;
  versionApp: string;
  photos: PhotoExportee[];
  fichiersPlan: FichierPlanExporte[];
  fichiersDevis: FichierDevisExporte[];
}

export interface ResumeSauvegarde {
  biens: number;
  postesTravaux: number;
  visites: number;
  pieces: number;
  etages: number;
  photos: number;
  fichiersPlan: number;
  personnes: number;
  avis: number;
  plansFinancement: number;
  devis: number;
  fichiersDevis: number;
}

export type ResultatValidation = { ok: true; sauvegarde: Sauvegarde } | { ok: false; erreur: string };

const TABLES_LISTES = ['biens', 'postesTravaux', 'visites', 'pieces', 'etages', 'bareme', 'photos', 'fichiersPlan', 'personnes', 'avis', 'plansFinancement', 'devis', 'fichiersDevis'] as const;

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Vérifie qu'un JSON lu est bien une sauvegarde de l'appli, avant de toucher à la base.
 * Les tables absentes (fichier d'une version plus ancienne) sont lues comme vides.
 */
export function validerSauvegarde(brut: unknown): ResultatValidation {
  if (!estObjet(brut) || brut['format'] !== FORMAT_SAUVEGARDE) {
    return { ok: false, erreur: 'Ce fichier n’est pas une sauvegarde de Visite Immo.' };
  }
  const version = brut['version'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, erreur: 'Version de sauvegarde illisible.' };
  }
  if (version > VERSION_FORMAT) {
    return { ok: false, erreur: 'Cette sauvegarde vient d’une version plus récente de l’appli : mettez l’appli à jour avant de l’importer.' };
  }
  const complet: Record<string, unknown> = { ...brut };
  for (const table of TABLES_LISTES) {
    const liste = brut[table] ?? [];
    if (!Array.isArray(liste)) return { ok: false, erreur: `Section « ${table} » invalide.` };
    for (const element of liste) {
      if (!estObjet(element) || typeof element['id'] !== 'string' || !element['id']) {
        return { ok: false, erreur: `Section « ${table} » : un élément n’a pas d’identifiant.` };
      }
      if ((table === 'photos' || table === 'fichiersPlan' || table === 'fichiersDevis') && typeof element['donnees'] !== 'string') {
        return { ok: false, erreur: `Section « ${table} » : un fichier est vide ou tronqué.` };
      }
    }
    complet[table] = liste;
  }
  if (brut['parametres'] !== undefined && !estObjet(brut['parametres'])) {
    return { ok: false, erreur: 'Réglages invalides.' };
  }
  return {
    ok: true,
    sauvegarde: {
      ...(complet as unknown as Sauvegarde),
      exporteLe: typeof brut['exporteLe'] === 'string' ? brut['exporteLe'] : '',
      versionApp: typeof brut['versionApp'] === 'string' ? brut['versionApp'] : '',
    },
  };
}

export function resumerDonnees(d: Pick<DonneesBase, keyof ResumeSauvegarde>): ResumeSauvegarde {
  return {
    biens: d.biens.length,
    postesTravaux: d.postesTravaux.length,
    visites: d.visites.length,
    pieces: d.pieces.length,
    etages: d.etages.length,
    photos: d.photos.length,
    fichiersPlan: d.fichiersPlan.length,
    personnes: d.personnes.length,
    avis: d.avis.length,
    plansFinancement: d.plansFinancement.length,
    devis: d.devis.length,
    fichiersDevis: d.fichiersDevis.length,
  };
}

/** Nom du fichier téléchargé : `visite-immo-2026-10-16.json`. */
export function nomFichierSauvegarde(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `visite-immo-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`;
}

/** Nombre de jours entiers écoulés depuis une date ISO, ou `null` si elle est absente ou illisible. */
export function joursDepuis(dateIso: string | undefined, maintenant: Date): number | null {
  if (!dateIso) return null;
  const t = Date.parse(dateIso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((maintenant.getTime() - t) / 86_400_000));
}

/** Après ce délai (en jours), l'appli rappelle de refaire une sauvegarde. */
export const DELAI_RAPPEL_JOURS = 14;

export function sauvegardeAFaire(derniere: string | undefined, maintenant: Date, aDesDonnees: boolean): boolean {
  if (!aDesDonnees) return false;
  const jours = joursDepuis(derniere, maintenant);
  return jours === null || jours >= DELAI_RAPPEL_JOURS;
}
